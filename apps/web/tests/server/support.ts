import { OmniLogic, type OmniLogicProtocol } from "@rygine/omnilogic-local-sdk";
import type { StartStorageContext } from "@tanstack/start-storage-context";
import { runWithStartContext } from "@tanstack/start-storage-context";

// a server fn as the test harness sees it
type ServerFn<D> = {
  (opts: { data: D }): Promise<unknown>;
  __executeServer: (opts: {
    method: "POST";
    data: unknown;
  }) => Promise<unknown>;
};

const startContext = (): StartStorageContext => ({
  getRouter: () => {
    throw new Error("no router in a server fn test");
  },
  request: new Request("http://localhost/"),
  startOptions: undefined,
  contextAfterGlobalMiddlewares: undefined,
  executedRequestMiddlewares: new Set(),
  handlerType: "serverFn",
});

const failed = (outcome: unknown): outcome is { error: unknown } =>
  typeof outcome === "object" &&
  outcome !== null &&
  "error" in outcome &&
  outcome.error !== undefined;

// runs the fn's validator the way the server does, rejecting with its error
export const validateServerFn = async <D>(
  fn: ServerFn<D>,
  data: unknown,
): Promise<void> => {
  const outcome = await runWithStartContext(startContext(), () =>
    // oxlint-disable-next-line no-underscore-dangle -- TanStack's own name
    fn.__executeServer({ method: "POST", data }),
  );
  if (failed(outcome)) {
    throw outcome.error;
  }
};

// validates, then runs the handler, whose return does not surface
export const callServerFn = async <D>(
  fn: ServerFn<D>,
  data: D,
): Promise<void> => {
  await validateServerFn(fn, data);
  await runWithStartContext(startContext(), () => fn({ data }));
};

export type Sent = { opcode: number; xml: string };

// a session over a protocol stub that records every frame the SDK's real encoder builds
export const makeRecorder = () => {
  const sent: Sent[] = [];
  const protocol = {
    sendMessage: (opcode: number, xml: string) => {
      sent.push({ opcode, xml });
      return Promise.resolve({ id: 1 });
    },
    sendAndReceive: (opcode: number, xml: string) => {
      sent.push({ opcode, xml });
      return Promise.resolve("<Response/>");
    },
  } as unknown as OmniLogicProtocol;
  const omni = new OmniLogic({ host: "127.0.0.1", port: 10444, protocol });
  // an empty configuration and telemetry, the controller on with nothing installed
  omni.fetchTelemetry = () =>
    Promise.resolve({
      backyard: { configChksum: 0, state: 1, mspVersion: "R0502000" },
    } as never);
  omni.fetchConfig = () =>
    Promise.resolve({ backyard: { bodiesOfWater: [] } } as never);
  return { omni, sent, protocol };
};

// the <Parameter> values of a payload, in wire order
export const valuesOf = (xml: string): string[] =>
  [...xml.matchAll(/<Parameter\b[^>]*>([^<]*)<\/Parameter>/g)].map(
    (m) => m[1]!,
  );
