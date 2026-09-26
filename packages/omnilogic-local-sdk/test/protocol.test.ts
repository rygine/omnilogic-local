import { createSocket, type RemoteInfo } from "node:dgram";

import { vi } from "vitest";

import { COMMANDS, SWITCH_OPCODE } from "@/client/spec";
import {
  INBOUND_FRAME,
  OmniLogicMessage,
  OUTBOUND_ACK,
} from "@/transport/message";
import { OmniLogicProtocol } from "@/transport/protocol";
import { MessageQueue } from "@/transport/queue";
import { OmniLogicError, OmniTimeoutError } from "@/utils/errors";

type Reply = {
  ack?: boolean;
  frame?: number;
  payload?: string | null;
  // a frame of this opcode, sent before the reply
  before?: number;
  // a datagram too short to be a message, sent first
  junk?: boolean;
  // a lead message announcing these blocks, each sent behind its 8-byte header, with a frame of another opcode between
  blocks?: { chunks: string[]; msgSize: number; stray?: number };
};

// one block of a split reply: eight bytes of header, then its slice of the payload
const blockFrame = (id: number, data: string): OmniLogicMessage => {
  const message = new OmniLogicMessage(id, INBOUND_FRAME.blockMessage, null);
  message.payload = Buffer.concat([Buffer.alloc(8), Buffer.from(data, "utf8")]);
  return message;
};

const leadPayload = (msgSize: number, blockCount: number): string =>
  '<Response xmlns="http://nextgen.hayward.com/api"><Name>LeadMessage</Name>' +
  "<Parameters>" +
  `<Parameter name="MsgSize" dataType="int">${msgSize}</Parameter>` +
  `<Parameter name="MsgBlockCount" dataType="int">${blockCount}</Parameter>` +
  "</Parameters></Response>";

// a controller scripted by `respond`: what to send back for each request, recording every source port
const controller = (respond: (received: OmniLogicMessage) => Reply | null) => {
  const socket = createSocket("udp4");
  const sourcePorts: number[] = [];
  const acked: number[] = [];
  const send = (msg: OmniLogicMessage, remote: RemoteInfo) =>
    socket.send(msg.toBytes(), remote.port, remote.address);
  socket.on("message", (data, remote) => {
    sourcePorts.push(remote.port);
    const received = OmniLogicMessage.fromBytes(data);
    if (received.opCode === OUTBOUND_ACK) {
      acked.push(received.id);
      return;
    }
    const reply = respond(received);
    if (reply === null) {
      return;
    }
    if (reply.junk) {
      socket.send(Buffer.from("junk"), remote.port, remote.address);
    }
    if (reply.ack !== false) {
      send(new OmniLogicMessage(received.id, INBOUND_FRAME.ack, null), remote);
    }
    if (reply.blocks !== undefined) {
      const { chunks, msgSize, stray } = reply.blocks;
      send(
        new OmniLogicMessage(
          received.id + 1,
          INBOUND_FRAME.leadMessage,
          leadPayload(msgSize, chunks.length),
        ),
        remote,
      );
      if (stray !== undefined) {
        send(new OmniLogicMessage(received.id + 9, stray, null), remote);
      }
      chunks.forEach((chunk, i) =>
        send(blockFrame(received.id + 2 + i, chunk), remote),
      );
      return;
    }
    if (reply.before !== undefined) {
      send(new OmniLogicMessage(received.id + 9, reply.before, null), remote);
    }
    if (reply.frame !== undefined) {
      send(
        new OmniLogicMessage(
          received.id + 1,
          reply.frame,
          reply.payload ?? null,
        ),
        remote,
      );
    }
  });
  const ready = new Promise<number>((resolve) => {
    socket.on("listening", () => resolve(socket.address().port));
    socket.bind(0, "127.0.0.1");
  });
  return { ready, sourcePorts, acked, close: () => socket.close() };
};

const acksOnly = () => controller(() => ({}));
// acks nothing, so every send times out after its attempts
const silent = () => controller(() => null);
const FAST = { ackTimeoutMs: 150, nextMessageTimeoutMs: 150, minSendGapMs: 0 };
// for the pacing tests, where an operation should fail as fast as possible
const QUICK = { ackTimeoutMs: 5, nextMessageTimeoutMs: 5 };
const telemetry = (p: OmniLogicProtocol, options?: { settle: boolean }) =>
  p.sendMessage(SWITCH_OPCODE.GetTelemetry, null, options);

// live handle count
const openHandles = (): number =>
  // oxlint-disable-next-line no-underscore-dangle -- the only way to count fds
  (process as unknown as { _getActiveHandles: () => unknown[] })[
    "_getActiveHandles"
  ]().length;

// a closed socket releases its handle a turn of the event loop later
const settled = () => new Promise<void>((r) => setTimeout(r, 20));

describe("OmniLogicMessage", () => {
  it("round-trips through the 24-byte header, with and without a payload", () => {
    const withPayload = new OmniLogicMessage(
      42,
      COMMANDS.GetUIAirTempCmd.opcode,
      "<request/>",
    );
    withPayload.timestamp = 1700000000;
    expect(withPayload.clientType).toBe(0);
    expect(withPayload.payload.toString("utf-8")).toBe("<request/>\x00");
    const restored = OmniLogicMessage.fromBytes(withPayload.toBytes());
    expect([restored.id, restored.opCode, restored.timestamp]).toEqual([
      42,
      COMMANDS.GetUIAirTempCmd.opcode,
      1700000000,
    ]);
    expect(restored.payload.toString("utf-8")).toBe("<request/>\x00");

    const ack = new OmniLogicMessage(7, INBOUND_FRAME.ack, null);
    ack.timestamp = 1234567890;
    expect(ack.clientType).toBe(1);
    expect(ack.payload.length).toBe(0);
    const bytes = ack.toBytes();
    expect(bytes.length).toBe(24);
    const back = OmniLogicMessage.fromBytes(bytes);
    expect([back.id, back.opCode, back.timestamp]).toEqual([
      7,
      INBOUND_FRAME.ack,
      1234567890,
    ]);
    expect(back.payload.length).toBe(0);
  });
});

describe("MessageQueue", () => {
  const one = new OmniLogicMessage(1, INBOUND_FRAME.ack, "one");
  const two = new OmniLogicMessage(2, INBOUND_FRAME.ack, "two");

  it("hands messages to waiters in order; a timed-out wait withdraws itself", async () => {
    const queue = new MessageQueue();
    await expect(queue.next(10, "first")).rejects.toThrow(OmniTimeoutError);
    const first = queue.next(1000, "one");
    const second = queue.next(1000, "two");
    queue.add(one);
    queue.add(two);
    await expect(first).resolves.toBe(one);
    await expect(second).resolves.toBe(two);
  });

  it("rejects pending waits on reset, with a kernel error when given one, and works on after a plain reset", async () => {
    const queue = new MessageQueue();
    const pending = queue.next(1000, "wait");
    queue.reset();
    await expect(pending).rejects.toThrow(OmniTimeoutError);
    const later = queue.next(1000, "wait");
    queue.add(one);
    await expect(later).resolves.toBe(one);

    const failed = new MessageQueue();
    const waiting = failed.next(1000, "wait");
    const refused = new Error("EHOSTUNREACH");
    failed.reset(refused);
    await expect(waiting).rejects.toBe(refused);
    await expect(failed.next(1000, "wait")).rejects.toBe(refused);
  });
});

describe("OmniLogicProtocol", () => {
  it("opens a socket per operation, closes each, and leaks none that fails before it listens", async () => {
    const c = acksOnly();
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await protocol.sendMessage(300, "<Request/>");
      await protocol.sendMessage(300, "<Request/>");
      await Promise.all([
        protocol.sendMessage(300, "<Request/>"),
        protocol.sendMessage(300, "<Request/>"),
      ]);
      expect(new Set(c.sourcePorts).size).toBe(4);
      await settled();
      const before = openHandles();
      for (let i = 0; i < 5; i++) {
        await protocol.sendMessage(300, "<Request/>");
      }
      await settled();
      expect(openHandles()).toBe(before);

      const unopenable = new OmniLogicProtocol("127.0.0.1", 70000, FAST);
      for (let i = 0; i < 3; i++) {
        await expect(unopenable.sendMessage(300, "<Request/>")).rejects.toThrow(
          /port/i,
        );
      }
      await settled();
      expect(openHandles()).toBe(before);
    } finally {
      c.close();
    }
  });

  it("drops a malformed datagram and carries on", async () => {
    const c = controller((r) => ({
      junk: true,
      frame: r.opCode + 1000,
      payload: "<Response/>",
    }));
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await expect(
        protocol.sendAndReceive(300, "<Request/>"),
      ).resolves.toContain("<Response/>");
    } finally {
      c.close();
    }
  });

  it("takes a reply that arrives without its ack as the response", async () => {
    const c = controller((r) => ({
      ack: false,
      frame: r.opCode + 1000,
      payload: "<Response/>",
    }));
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await expect(
        protocol.sendAndReceive(300, "<Request/>"),
      ).resolves.toContain("<Response/>");
    } finally {
      c.close();
    }
  });

  it.each(["", "<Response><Parameters/></Response>"])(
    "fails a lead message with an empty payload as an OmniLogic error: %j",
    async (payload) => {
      const c = controller(() => ({
        frame: INBOUND_FRAME.leadMessage,
        payload,
      }));
      const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
      try {
        await expect(
          protocol.sendAndReceive(300, "<Request/>"),
        ).rejects.toThrow(OmniLogicError);
      } finally {
        c.close();
      }
    },
  );

  it("does not let a failed operation poison the next one", async () => {
    // acked, then silence
    const unanswered = COMMANDS.GetUIPoolTempCmd.opcode;
    const c = controller((r) =>
      r.opCode === unanswered
        ? {}
        : { frame: r.opCode + 1000, payload: "<Response/>" },
    );
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await expect(
        protocol.sendAndReceive(unanswered, "<Request/>"),
      ).rejects.toThrow(OmniTimeoutError);
      await expect(
        protocol.sendAndReceive(300, "<Request/>"),
      ).resolves.toContain("<Response/>");
    } finally {
      c.close();
    }
  });

  it("gives each retransmission a new id", async () => {
    const ids: number[] = [];
    const c = controller((received) => {
      ids.push(received.id);
      return { ack: false };
    });
    const port = await c.ready;
    try {
      const protocol = new OmniLogicProtocol("127.0.0.1", port, FAST);
      await expect(
        protocol.sendMessage(COMMANDS.SetBeeper.opcode, "<Request/>"),
      ).rejects.toBeInstanceOf(OmniTimeoutError);
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5);
    } finally {
      c.close();
    }
  });

  it("gives up on a refused socket instead of retransmitting", async () => {
    const socket = createSocket("udp4");
    await new Promise<void>((r) => socket.bind(0, "127.0.0.1", () => r()));
    const port = socket.address().port;
    await new Promise<void>((r) => socket.close(() => r()));

    const protocol = new OmniLogicProtocol("127.0.0.1", port, FAST);
    const started = Date.now();
    await expect(
      protocol.sendMessage(COMMANDS.SetBeeper.opcode, "<Request/>"),
    ).rejects.toThrow(/ECONNREFUSED/);
    // one attempt, not the five an unanswered send takes
    expect(Date.now() - started).toBeLessThan(FAST.ackTimeoutMs * 3);
  });

  it("names the kernel's refusal, of the connect or of the send, after one attempt", async () => {
    // the broadcast address without broadcast enabled: Linux refuses the connect, macOS each send
    const protocol = new OmniLogicProtocol("255.255.255.255", 10444, FAST);
    const started = Date.now();
    await expect(protocol.sendMessage(300, "<Request/>")).rejects.toThrow(
      /EACCES/,
    );
    expect(Date.now() - started).toBeLessThan(FAST.ackTimeoutMs * 3);
  });
});

describe("a frame of another kind before the reply", () => {
  it("is skipped when the reply's opcode is known, taken otherwise", async () => {
    const { ready, close } = controller(() => ({
      before: INBOUND_FRAME.telemetryUpdate,
      frame: 1025,
      payload: "<Response/>",
    }));
    const port = await ready;
    try {
      const protocol = new OmniLogicProtocol("127.0.0.1", port, FAST);
      await expect(
        protocol.sendAndReceive(25, "<Request/>", { reply: 1025 }),
      ).resolves.toBe("<Response/>");
      await expect(protocol.sendAndReceive(25, "<Request/>")).resolves.toBe("");
    } finally {
      close();
    }
  });
});

describe("a read the controller acknowledges but does not answer", () => {
  it("is sent again up to attempts, once by default", async () => {
    let requests = 0;
    const { ready, close } = controller(() => {
      requests++;
      return requests < 3 ? {} : { frame: 1300, payload: "<Response/>" };
    });
    const port = await ready;
    try {
      const protocol = new OmniLogicProtocol("127.0.0.1", port, FAST);
      await expect(protocol.sendAndReceive(300, "<Request/>")).rejects.toThrow(
        OmniTimeoutError,
      );
      expect(requests).toBe(1);
      await expect(
        protocol.sendAndReceive(300, "<Request/>", { attempts: 3 }),
      ).resolves.toBe("<Response/>");
      expect(requests).toBe(3);
    } finally {
      close();
    }
  });
});

describe("multi-block replies", () => {
  it("reassembles the blocks and drops the padding past the announced size", async () => {
    const body = "<Response>reassembled</Response>";
    const c = controller(() => ({
      // the last block is padded out past the end of the payload
      blocks: {
        chunks: [body.slice(0, 12), `${body.slice(12)}\0\0\0`],
        msgSize: body.length,
      },
    }));
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await expect(protocol.sendAndReceive(300, "<Request/>")).resolves.toBe(
        body,
      );
    } finally {
      c.close();
    }
  });

  it("acknowledges and skips a frame of another kind between the blocks", async () => {
    const body = "<Response>reassembled</Response>";
    let requestId = 0;
    const c = controller((received) => {
      requestId = received.id;
      return {
        blocks: {
          chunks: [body.slice(0, 12), body.slice(12)],
          msgSize: body.length,
          stray: INBOUND_FRAME.telemetryUpdate,
        },
      };
    });
    const protocol = new OmniLogicProtocol("127.0.0.1", await c.ready, FAST);
    try {
      await expect(protocol.sendAndReceive(300, "<Request/>")).resolves.toBe(
        body,
      );
      await settled();
      expect(c.acked).toContain(requestId + 9);
    } finally {
      c.close();
    }
  });
});

describe("send throttle", () => {
  it("spaces operations by the gap after each ends, across instances, serial even at 0", async () => {
    const a = silent();
    const b = silent();
    const portA = await a.ready;
    const portB = await b.ready;
    try {
      const spaced = new OmniLogicProtocol("127.0.0.1", portA, {
        ...QUICK,
        minSendGapMs: 120,
      });
      const starts: number[] = [];
      const op = () =>
        telemetry(spaced).catch(() => {
          starts.push(Date.now());
        });
      let t0 = Date.now();
      await Promise.all([op(), op(), op()]);
      // each op fails ~ackTimeoutMs after it started, three starts >= 2 gaps
      expect(Math.max(...starts) - t0).toBeGreaterThanOrEqual(2 * 120 - 5);

      const other = new OmniLogicProtocol("127.0.0.1", portB, {
        ...QUICK,
        minSendGapMs: 300,
      });
      // the queue is process-wide: a second instance waits its own gap behind the first
      t0 = Date.now();
      await Promise.all([
        telemetry(spaced).catch(() => undefined),
        telemetry(other).catch(() => undefined),
      ]);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(300 - 5);

      const unthrottled = new OmniLogicProtocol("127.0.0.1", portA, {
        ...QUICK,
        minSendGapMs: 0,
      });
      t0 = Date.now();
      await Promise.all(
        [1, 2, 3].map(() => telemetry(unthrottled).catch(() => undefined)),
      );
      expect(Date.now() - t0).toBeLessThan(200);

      // and still one at a time: unacknowledged, each takes five attempts of 40 ms
      const serial = new OmniLogicProtocol("127.0.0.1", portA, {
        ackTimeoutMs: 40,
        minSendGapMs: 0,
      });
      t0 = Date.now();
      await Promise.all([
        telemetry(serial).catch(() => undefined),
        telemetry(serial).catch(() => undefined),
      ]);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(2 * 5 * 40 - 10);
    } finally {
      a.close();
      b.close();
    }
  });

  it("waits no longer than the gap when the clock steps backwards", async () => {
    const c = silent();
    const port = await c.ready;
    const realNow = Date.now;
    try {
      const p = new OmniLogicProtocol("127.0.0.1", port, {
        ...QUICK,
        minSendGapMs: 50,
      });
      await telemetry(p).catch(() => undefined);
      vi.spyOn(Date, "now").mockImplementation(() => realNow() - 60_000);
      const t0 = realNow();
      await telemetry(p).catch(() => undefined);
      expect(realNow() - t0).toBeLessThan(1000);
    } finally {
      vi.mocked(Date.now).mockRestore();
      c.close();
    }
  });

  it("holds every later operation, queued or from another instance, behind a settling send, acknowledged or not", async () => {
    const acked = acksOnly();
    const unacked = silent();
    const port = await acked.ready;
    const silentPort = await unacked.ready;
    try {
      const p = new OmniLogicProtocol("127.0.0.1", port, {
        ...QUICK,
        minSendGapMs: 0,
        settleGraceMs: 150,
      });
      const other = new OmniLogicProtocol("127.0.0.1", port, {
        ...QUICK,
        minSendGapMs: 0,
      });
      let t0 = Date.now();
      // not awaited: the next operation queues behind a send still in flight
      const settling = telemetry(p, { settle: true });
      await telemetry(p);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(150 - 5);
      await settling;

      await telemetry(p, { settle: true });
      t0 = Date.now();
      await telemetry(other);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(150 - 5);

      const unanswered = new OmniLogicProtocol("127.0.0.1", silentPort, {
        ...QUICK,
        minSendGapMs: 0,
        settleGraceMs: 150,
      });
      await expect(telemetry(unanswered, { settle: true })).rejects.toThrow(
        /No acknowledgment from the controller/,
      );
      t0 = Date.now();
      await telemetry(unanswered).catch(() => {});
      expect(Date.now() - t0).toBeGreaterThanOrEqual(150 - 5);
    } finally {
      acked.close();
      unacked.close();
    }
  });

  it("releases the gate when the settle probe cannot open a socket, nothing left unhandled", async () => {
    // port 0 is refused at open, for the settling send and for the probe alike
    const p = new OmniLogicProtocol("127.0.0.1", 0, {
      ...QUICK,
      minSendGapMs: 0,
      settleGraceMs: 10,
    });
    let unhandled: unknown = null;
    const onUnhandled = (reason: unknown) => {
      unhandled = reason;
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      await expect(telemetry(p, { settle: true })).rejects.toThrow(/Port/);
      await new Promise((r) => globalThis.setTimeout(r, 50));
      await expect(telemetry(p)).rejects.toThrow(/Port/);
      await new Promise((r) => globalThis.setTimeout(r, 50));
      expect(unhandled).toBeNull();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
