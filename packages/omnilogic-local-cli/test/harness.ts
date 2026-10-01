import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

import type { OmniLogicProtocol } from "@rygine/omnilogic-local-sdk";

import { run } from "@/cli";

// the reference config
export const CONFIG_XML = readFileSync(
  join(import.meta.dirname, "../../../fixtures/config.xml"),
  "utf8",
);
export const SYSINFO_XML = readFileSync(
  join(import.meta.dirname, "../../../fixtures/sysinfo.xml"),
  "utf8",
);
export const TELEMETRY_XML =
  '<?xml version="1.0" encoding="UTF-8"?><STATUS version="1.11"><Backyard systemId="0" statusVersion="11" airTemp="72" state="1" configChksum="2824508" mspVersion="R0502000"/><BodyOfWater systemId="1" flow="1" waterTemp="80"/></STATUS>';
export const POOL_TEMP_REPLY =
  '<?xml version="1.0" encoding="UTF-8" ?><Response xmlns="http://nextgen.hayward.com/api"><Name>UIGetPoolTempRsp</Name><Parameters><Parameter name="PoolID" dataType="int">1</Parameter><Parameter name="Temp" dataType="int" unit="F">86</Parameter></Parameters></Response>';

const capture = () => {
  let text = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  return { stream, text: () => text };
};

export type Sent = { opcode: number; xml: string };

// runs the cli against a fake controller, recording every send
// stdin is what the user types, tty makes stdin and stderr a terminal
// dir is the config directory, a fresh temporary one by default
export const cli = async (
  args: string[],
  options: {
    answers?: Record<number, string>;
    stdin?: string;
    tty?: boolean;
    dir?: string;
  } = {},
) => {
  const sent: Sent[] = [];
  const answers = options.answers ?? {};
  const protocol = {
    sendMessage: (opcode: number, xml: string) => {
      sent.push({ opcode, xml });
      return Promise.resolve({ id: 1 });
    },
    sendAndReceive: (opcode: number, xml: string) => {
      sent.push({ opcode, xml });
      return Promise.resolve(answers[opcode] ?? "<Response/>");
    },
  } as unknown as OmniLogicProtocol;
  const stdout = capture();
  const stderr = capture();
  Object.assign(stderr.stream, { isTTY: options.tty ?? false });
  const stdin = Object.assign(Readable.from([options.stdin ?? ""]), {
    isTTY: options.tty ?? false,
  });
  const dir = options.dir ?? mkdtempSync(join(tmpdir(), "omnilogic-local-"));
  const code = await run(args, {
    stdin,
    stdout: stdout.stream,
    stderr: stderr.stream,
    configDir: dir,
    protocol,
  });
  return { code, stdout: stdout.text(), stderr: stderr.text(), sent, dir };
};
