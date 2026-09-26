import { createSocket, type Socket } from "node:dgram";
import { setTimeout } from "node:timers/promises";
import { inflateSync } from "node:zlib";

import { SWITCH_OPCODE } from "@/client/spec";
import {
  INBOUND_FRAME,
  isAck,
  OmniLogicMessage,
  OUTBOUND_ACK,
  type SendableOpcode,
} from "@/transport/message";
import { MessageQueue } from "@/transport/queue";
import { OmniLogicError, OmniTimeoutError } from "@/utils/errors";
import { defined, isRecord } from "@/utils/helpers";
import { createLogger } from "@/utils/logger";
import {
  buildMessageXml,
  parametersByName,
  parseXML,
  type ResponseMessage,
} from "@/utils/xml";

const protocolLog = createLogger("protocol");

// how many blocks follow and how many bytes of them are payload
const parseLeadMessage = (payload: Buffer) => {
  const xml = payload.subarray(0, -1).toString("utf-8");
  const parsed: ResponseMessage = parseXML(xml);
  if (!isRecord(parsed.response) || !isRecord(parsed.response.parameters)) {
    throw new OmniLogicError(`Malformed reply header: ${JSON.stringify(xml)}`);
  }
  const params = parametersByName(parsed.response.parameters.parameter);
  const count = params.msgBlockCount;
  if (typeof count !== "number") {
    throw new OmniLogicError(
      `Malformed reply header parameters: ${JSON.stringify(params)}`,
    );
  }
  const size = params.msgSize;
  return {
    blockCount: count,
    msgSize: typeof size === "number" && size > 0 ? size : undefined,
  };
};

type Connection = {
  socket: Socket;
  queue: MessageQueue;
  timings: Timings;
};

export type Timings = {
  // per attempt, before retransmitting
  ackTimeoutMs: number;
  // for the reply, after the send is acknowledged
  nextMessageTimeoutMs: number;
  // after one operation ends and before the next starts, 0 for no gap
  minSendGapMs: number;
  // after a settling command, the pause once the controller answers again
  settleGraceMs: number;
};

export const DEFAULT_TIMINGS: Timings = {
  ackTimeoutMs: 5000,
  // the controller retransmits five times at 2.1 s
  nextMessageTimeoutMs: 2.1 * 5 * 1000,
  minSendGapMs: 500,
  settleGraceMs: 2000,
};

export type OperationOptions = {
  timings?: Partial<Timings>;
  // the controller goes quiet after this send
  settle?: boolean;
  // how many times to send when the controller acknowledges but never replies, default 1
  attempts?: number;
  // the opcode the reply carries when it arrives in one frame, any other frame is skipped
  reply?: number;
};

const ACK_ATTEMPTS = 5;

const newId = () => Math.floor(Math.random() * 0xffffffff);

// the end of the last queued operation
let queueTail = Promise.resolve(0);

export class OmniLogicProtocol {
  #host: string;
  #port: number;
  #timings: Timings;

  constructor(host: string, port: number, timings: Partial<Timings> = {}) {
    this.#host = host;
    this.#port = port;
    this.#timings = { ...DEFAULT_TIMINGS, ...defined(timings) };
  }

  get #key() {
    return `${this.#host}:${this.#port}`;
  }

  async #waitForTurn(timings: Timings, previous: Promise<number>) {
    const started = Date.now();
    const ended = await previous;
    protocolLog.trace("previous operation ended", {
      key: this.#key,
      waitedMs: Date.now() - started,
    });
    // capped at the gap
    const wait = Math.min(
      timings.minSendGapMs,
      ended + timings.minSendGapMs - Date.now(),
    );
    if (wait > 0) {
      protocolLog.debug("throttling", { key: this.#key, waitMs: wait });
      await setTimeout(wait);
    }
  }

  async #settle(timings: Timings) {
    protocolLog.debug("settling", { key: this.#key });
    const started = Date.now();
    let conn: Connection;
    try {
      conn = await this.#open(timings);
    } catch (error) {
      protocolLog.warn("could not open a socket to settle; releasing", {
        key: this.#key,
        error,
      });
      return;
    }
    try {
      await this.#send(conn, SWITCH_OPCODE.GetTelemetry, null);
      await this.#processResponse(conn, INBOUND_FRAME.telemetryUpdate);
      protocolLog.trace("controller answered the settle probe", {
        key: this.#key,
        ms: Date.now() - started,
      });
    } catch (error) {
      protocolLog.warn("controller did not answer while settling; releasing", {
        key: this.#key,
        error,
      });
    } finally {
      this.#close(conn);
    }
    if (timings.settleGraceMs > 0) {
      protocolLog.trace("settle grace", {
        key: this.#key,
        ms: timings.settleGraceMs,
      });
      await setTimeout(timings.settleGraceMs);
    }
    protocolLog.debug("settled; releasing queued operations", {
      key: this.#key,
      ms: Date.now() - started,
    });
  }

  async #withConnection<T>(
    options: OperationOptions,
    fn: (conn: Connection) => Promise<T>,
  ) {
    const timings = { ...this.#timings, ...defined(options.timings ?? {}) };
    const previous = queueTail;
    const { promise: ended, resolve: end } = Promise.withResolvers<number>();
    queueTail = ended;
    try {
      await this.#waitForTurn(timings, previous);
      const started = Date.now();
      const conn = await this.#open(timings);
      try {
        const result = await fn(conn);
        protocolLog.trace("operation complete", {
          key: this.#key,
          ms: Date.now() - started,
        });
        return result;
      } finally {
        this.#close(conn);
      }
    } finally {
      if (options.settle) {
        void this.#settle(timings).finally(() => end(Date.now()));
      } else {
        end(Date.now());
      }
    }
  }

  #close(conn: Connection) {
    conn.queue.reset();
    try {
      conn.socket.close();
    } catch {
      // already closed
    }
    protocolLog.trace("socket closed");
  }

  #open(timings: Timings): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const socket = createSocket("udp4");
      const queue = new MessageQueue();
      const conn: Connection = { socket, queue, timings };
      let connected = false;

      socket.on("error", (err) => {
        protocolLog.debug("socket error", { err });
        if (connected) {
          queue.reset(err);
        } else {
          socket.close();
          reject(err);
        }
      });

      socket.on("message", (data: Buffer) => {
        try {
          const message = OmniLogicMessage.fromBytes(data);
          protocolLog.trace("received message", {
            message: message.toString(),
          });
          queue.add(message);
        } catch (error) {
          protocolLog.warn("dropped a malformed datagram", {
            bytes: data.length,
            error,
          });
        }
      });

      socket.on("connect", () => {
        connected = true;
        protocolLog.debug("socket open");
        resolve(conn);
      });

      protocolLog.debug("opening socket", {
        host: this.#host,
        port: this.#port,
      });
      try {
        socket.connect(this.#port, this.#host);
      } catch (err) {
        socket.close();
        reject(err);
      }
    });
  }

  async sendMessage(
    opCode: SendableOpcode,
    payload: string | null,
    options: OperationOptions = {},
  ) {
    return this.#withConnection(options, (conn) =>
      this.#send(conn, opCode, payload),
    );
  }

  async sendAndReceive(
    opCode: SendableOpcode,
    payload: string | null,
    options: OperationOptions = {},
  ) {
    const attempts = Math.max(1, options.attempts ?? 1);
    return this.#withConnection(options, async (conn) => {
      for (let attempt = 1; ; attempt++) {
        const message = await this.#send(conn, opCode, payload);
        protocolLog.debug("waiting for response", { id: message.id });
        try {
          const response = await this.#processResponse(conn, options.reply);
          protocolLog.debug("received response", {
            id: message.id,
            opCode,
            length: response.length,
          });
          return response;
        } catch (error) {
          if (!(error instanceof OmniTimeoutError) || attempt >= attempts) {
            throw error;
          }
          protocolLog.warn("acknowledged but no reply, sending again", {
            id: message.id,
            opCode,
            attempt,
            of: attempts,
          });
        }
      }
    });
  }

  async #nextReply(conn: Connection, reply: number | undefined) {
    protocolLog.debug("waiting for the reply", { reply });
    for (;;) {
      const message = await conn.queue.next(
        conn.timings.nextMessageTimeoutMs,
        "No reply from the controller",
      );
      if (isAck(message.opCode)) {
        protocolLog.trace("ACK received, skipping", { id: message.id });
        continue;
      }
      // a long reply arrives as a lead message whatever its opcode
      if (
        reply !== undefined &&
        message.opCode !== reply &&
        message.opCode !== INBOUND_FRAME.leadMessage
      ) {
        protocolLog.trace("message of another kind, skipping", {
          id: message.id,
          opCode: message.opCode,
          reply,
        });
        await this.#sendAck(conn, message.id);
        continue;
      }
      protocolLog.debug("reply received", { id: message.id });
      return message;
    }
  }

  async #waitForAck(conn: Connection, ackId: number) {
    protocolLog.debug("waiting for ACK", { id: ackId });
    const message = await conn.queue.next(
      conn.timings.ackTimeoutMs,
      `No acknowledgment from the controller (message ${ackId})`,
    );
    if (message.id !== ackId) {
      protocolLog.trace("reply arrived before the ACK; putting it back", {
        id: message.id,
        expected: ackId,
        opCode: message.opCode,
      });
      conn.queue.add(message);
    }
  }

  async #sendAck(conn: Connection, messageId: number) {
    const message = buildMessageXml("Ack");
    protocolLog.debug("sending ACK", { id: messageId });
    await this.#send(conn, OUTBOUND_ACK, message, messageId);
  }

  async #send(
    conn: Connection,
    opCode: SendableOpcode,
    payload: string | null,
    messageId?: number,
  ) {
    let message = new OmniLogicMessage(messageId ?? newId(), opCode, payload);
    protocolLog.debug("sending message", { message: message.toString() });

    for (let attempt = 0; attempt < ACK_ATTEMPTS; attempt++) {
      // the controller takes a retransmission as a new request
      if (attempt > 0 && messageId === undefined) {
        message = new OmniLogicMessage(newId(), opCode, payload);
      }
      const bytes = message.toBytes();
      conn.socket.send(bytes, (err) => {
        if (err) {
          protocolLog.warn("send failed", { id: message.id, err: err.message });
          conn.queue.reset(err);
        }
      });
      protocolLog.trace("sent", {
        id: message.id,
        opCode,
        attempt: attempt + 1,
        bytes: bytes.length,
      });
      if (isAck(message.opCode)) {
        break;
      }

      try {
        await this.#waitForAck(conn, message.id);
        protocolLog.debug("ACK received", { id: message.id });
        break;
      } catch (error) {
        if (
          !(error instanceof OmniTimeoutError) ||
          attempt === ACK_ATTEMPTS - 1
        ) {
          throw error;
        }
        protocolLog.warn("ACK not received, retrying", {
          id: message.id,
          attempt: attempt + 1,
        });
      }
    }

    return message;
  }

  async #processResponse(conn: Connection, reply?: number) {
    const message = await this.#nextReply(conn, reply);
    await this.#sendAck(conn, message.id);

    let payload: Buffer;
    if (message.opCode === INBOUND_FRAME.leadMessage) {
      const { blockCount, msgSize } = parseLeadMessage(message.payload);
      protocolLog.trace("received lead message", { blockCount });
      if (blockCount === 0) {
        protocolLog.trace(
          "empty response: the lead message announced no blocks",
        );
        return "";
      }

      const blocks: Map<number, Buffer> = new Map();
      while (blocks.size < blockCount) {
        const block = await conn.queue.next(
          conn.timings.nextMessageTimeoutMs,
          "The controller stopped partway through its reply",
        );
        // a resend means the controller missed the ack
        if (
          block.id === message.id ||
          (block.opCode === INBOUND_FRAME.blockMessage && blocks.has(block.id))
        ) {
          protocolLog.trace("duplicate message, acknowledging again", {
            id: block.id,
          });
          await this.#sendAck(conn, block.id);
          continue;
        }
        if (block.opCode !== INBOUND_FRAME.blockMessage) {
          protocolLog.trace("message of another kind, skipping", {
            id: block.id,
            opCode: block.opCode,
          });
          await this.#sendAck(conn, block.id);
          continue;
        }
        await this.#sendAck(conn, block.id);
        // a block's first 8 bytes are a header
        blocks.set(block.id, block.payload.subarray(8));
        protocolLog.trace("block received", {
          id: block.id,
          received: blocks.size,
          of: blockCount,
          bytes: block.payload.length - 8,
        });
      }
      payload = Buffer.concat(
        Array.from(blocks.entries())
          .toSorted((a, b) => a[0] - b[0])
          .map(([, data]) => data),
      );
      if (msgSize !== undefined && msgSize < payload.length) {
        protocolLog.trace("trimming padding past the announced size", {
          from: payload.length,
          to: msgSize,
        });
        payload = payload.subarray(0, msgSize);
      }
      protocolLog.trace("blocks reassembled", {
        blocks: blockCount,
        bytes: payload.length,
      });
    } else {
      payload = message.payload;
    }

    if (message.compressed && payload.length > 0) {
      try {
        const compressedBytes = payload.length;
        payload = inflateSync(payload);
        protocolLog.trace("decompressed", {
          from: compressedBytes,
          to: payload.length,
        });
      } catch (error: unknown) {
        protocolLog.debug("decompression failed", {
          opCode: message.opCode,
          error,
        });
        throw new OmniLogicError("Could not decompress the reply", {
          cause: error,
        });
      }
    }

    return payload.toString("utf-8").replace(/\0$/, "");
  }
}
