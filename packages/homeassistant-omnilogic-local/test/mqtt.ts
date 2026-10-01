import type { MqttClient } from "mqtt";

type Published = { topic: string; payload: string; retain: boolean };

// an MQTT client that records what it is told and replays what a test delivers
export const fakeClient = () => {
  const published: Published[] = [];
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const emit = (event: string, ...args: unknown[]) => {
    for (const fn of handlers[event] ?? []) {
      fn(...args);
    }
  };
  const client = {
    connected: true,
    publish(topic: string, payload: string, opts: { retain?: boolean } = {}) {
      published.push({ topic, payload, retain: opts.retain === true });
      return client;
    },
    subscribe() {
      return client;
    },
    on(event: string, fn: (...args: unknown[]) => void) {
      (handlers[event] ??= []).push(fn);
      return client;
    },
  };
  // the last payload on a topic
  const last = (topic: string) =>
    published.findLast((p) => p.topic === topic)?.payload;
  return {
    client: client as unknown as MqttClient,
    published,
    connect: () => emit("connect"),
    // a message from the broker, live or retained
    message: (topic: string, payload: string, retain = false) =>
      emit("message", topic, Buffer.from(payload), { retain }),
    last,
    json: (topic: string) => {
      const payload = last(topic);
      return payload === undefined
        ? undefined
        : (JSON.parse(payload) as Record<string, unknown>);
    },
  };
};
