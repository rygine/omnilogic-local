import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadSettings } from "@/settings";

const options = async (value: object) => {
  const dir = await mkdtemp(join(tmpdir(), "ha-"));
  const path = join(dir, "options.json");
  await writeFile(path, JSON.stringify(value));
  return path;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadSettings", () => {
  it("reads the environment with defaults, a 5 s poll floor, a diagnostics interval of 0, a one-day ceiling, API access from HA_URL and HA_TOKEN, and a speed unit", async () => {
    const env = {
      OMNILOGIC_HOST: "192.168.1.100",
      MQTT_URL: "mqtt://u:p@broker:1883",
    };

    expect(await loadSettings(env)).toEqual({
      host: "192.168.1.100",
      mqttUrl: "mqtt://u:p@broker:1883",
      pollInterval: 30,
      diagnosticsInterval: 600,
      logLevel: undefined,
      stateDir: ".",
      api: undefined,
      disableImportedSchedules: false,
      speedUnit: "rpm",
      diagnosticsDir: ".",
    });

    const floored = await loadSettings({
      ...env,
      POLL_INTERVAL: "1",
      DIAGNOSTICS_INTERVAL: "0",
    });
    expect([floored.pollInterval, floored.diagnosticsInterval]).toEqual([5, 0]);

    // a day is the longest interval
    const capped = await loadSettings({
      ...env,
      POLL_INTERVAL: "2592000",
      DIAGNOSTICS_INTERVAL: "2592000",
    });
    expect([capped.pollInterval, capped.diagnosticsInterval]).toEqual([
      86400, 86400,
    ]);

    const withApi = await loadSettings({
      ...env,
      HA_URL: "http://ha:8123/",
      HA_TOKEN: "t",
    });
    expect(withApi.api).toEqual({ url: "http://ha:8123/api", token: "t" });

    const disabling = await loadSettings({
      ...env,
      DISABLE_IMPORTED_SCHEDULES: "true",
    });
    expect(disabling.disableImportedSchedules).toBe(true);

    const percent = await loadSettings({ ...env, SPEED_UNIT: "percent" });
    expect(percent.speedUnit).toBe("percent");
  });

  it("asks the Supervisor for the broker in add-on mode, unless mqtt_url is set", async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        data: {
          host: "core-mosquitto",
          port: 1883,
          username: "a",
          password: "b",
          ssl: false,
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const path = await options({
      host: "h",
      poll_interval: 10,
      diagnostics_interval: 600,
      log_level: "info",
    });

    expect(await loadSettings({ SUPERVISOR_TOKEN: "sv" }, path)).toEqual({
      host: "h",
      mqttUrl: "mqtt://a:b@core-mosquitto:1883",
      pollInterval: 10,
      diagnosticsInterval: 600,
      logLevel: "info",
      stateDir: "/data",
      api: { url: "http://supervisor/core/api", token: "sv" },
      disableImportedSchedules: false,
      speedUnit: "rpm",
      diagnosticsDir: "/share/omnilogiclocal",
    });
    expect(fetch).toHaveBeenCalledWith("http://supervisor/services/mqtt", {
      headers: { Authorization: "Bearer sv" },
    });

    fetch.mockClear();
    const own = await loadSettings(
      { SUPERVISOR_TOKEN: "sv" },
      await options({ host: "h", mqtt_url: "mqtt://x" }),
    );
    expect(own.mqttUrl).toBe("mqtt://x");

    const disabling = await loadSettings(
      { SUPERVISOR_TOKEN: "sv" },
      await options({
        host: "h",
        mqtt_url: "mqtt://x",
        disable_imported_schedules: true,
        speed_unit: "percent",
      }),
    );
    expect(disabling.disableImportedSchedules).toBe(true);
    expect(disabling.speedUnit).toBe("percent");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a missing host or broker, a non-number interval, an unknown speed unit, an empty controller address, and an add-on with no broker", async () => {
    await expect(loadSettings({ MQTT_URL: "m" })).rejects.toThrow(
      "OMNILOGIC_HOST",
    );
    await expect(loadSettings({ OMNILOGIC_HOST: "h" })).rejects.toThrow(
      "MQTT_URL",
    );
    await expect(
      loadSettings({ OMNILOGIC_HOST: "h", MQTT_URL: "m", POLL_INTERVAL: "x" }),
    ).rejects.toThrow('poll interval "x" is not a number');
    await expect(
      loadSettings({ OMNILOGIC_HOST: "h", MQTT_URL: "m", SPEED_UNIT: "fast" }),
    ).rejects.toThrow('speed unit "fast" is not rpm or percent');

    await expect(
      loadSettings(
        { SUPERVISOR_TOKEN: "sv" },
        await options({ host: " ", mqtt_url: "mqtt://x" }),
      ),
    ).rejects.toThrow("The controller address is not set");

    vi.stubGlobal("fetch", async () => new Response("", { status: 400 }));
    await expect(
      loadSettings({ SUPERVISOR_TOKEN: "sv" }, await options({ host: "h" })),
    ).rejects.toThrow(
      "No MQTT broker: install the Mosquitto broker add-on or set mqtt_url",
    );
  });
});
