import type { CommandOpcode, SWITCH_OPCODE } from "@/client/spec";

// acknowledgment of a controller message, sent with that message's id
export const OUTBOUND_ACK = 0;

export const INBOUND_FRAME = {
  ack: 1002,
  // an unsolicited telemetry push, always compressed
  telemetryUpdate: 1004,
  // header of a split payload, declaring how many blocks follow
  leadMessage: 1998,
  // one block of a split payload
  blockMessage: 1999,
} as const;

export type SendableOpcode =
  | CommandOpcode
  | (typeof SWITCH_OPCODE)[keyof typeof SWITCH_OPCODE]
  | typeof OUTBOUND_ACK;

export const isAck = (opCode: number) =>
  opCode === OUTBOUND_ACK || opCode === INBOUND_FRAME.ack;

export class OmniLogicMessage {
  id: number;
  opCode: number;
  payload: Buffer;
  // 0=request with body, 1=bare request, 2=panel, 3=peer controller
  clientType: number;
  version: string;
  timestamp: number = Math.floor(Date.now() / 1000);
  compressed: boolean = false;

  constructor(
    messageId: number,
    opCode: number,
    payload: string | null = null,
    version: string = "1.19",
  ) {
    this.id = messageId;
    this.opCode = opCode;
    this.clientType = payload !== null ? 0 : 1;
    this.payload = Buffer.from(
      payload !== null ? `${payload}\x00` : "",
      "utf-8",
    );
    this.version = version;
  }

  toBytes() {
    const header = Buffer.alloc(24);
    header.writeUInt32BE(this.id, 0);
    header.writeBigUInt64BE(BigInt(this.timestamp), 4);
    header.write(this.version, 12, "ascii");
    header.writeUInt32BE(this.opCode, 16);
    header.writeUInt8(this.clientType, 20);
    header.writeUInt8(this.compressed ? 1 : 0, 22);
    return Buffer.concat([header, this.payload]);
  }

  toString() {
    const head =
      `ID: ${this.id}, Type: ${this.opCode}, Compressed: ${this.compressed}, ` +
      `Client: ${this.clientType}, Version: ${this.version}, Timestamp: ${this.timestamp}`;
    // a block or compressed payload is not text
    if (this.opCode === INBOUND_FRAME.blockMessage || this.compressed) {
      return head;
    }
    return `${head}, Body: ${this.payload.subarray(0, -1).toString("utf-8")}`;
  }

  static fromBytes(data: Buffer) {
    if (data.length < 24) {
      throw new Error("Invalid message: too short");
    }
    const header = data.subarray(0, 24);
    const version = header
      .subarray(12, 16)
      .toString("ascii")
      .replace(/\0/g, "");
    const message = new OmniLogicMessage(
      header.readUInt32BE(0),
      header.readUInt32BE(16),
      null,
      version,
    );
    message.timestamp = Number(header.readBigUInt64BE(4));
    message.clientType = header.readUInt8(20);
    message.compressed =
      header.readUInt8(22) === 1 ||
      message.opCode === INBOUND_FRAME.telemetryUpdate;
    message.payload = data.subarray(24);
    return message;
  }
}
