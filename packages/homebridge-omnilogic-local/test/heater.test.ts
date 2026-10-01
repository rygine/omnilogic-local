import { Characteristic, Service } from "@homebridge/hap-nodejs";
import {
  CommandFailedError,
  OmniTimeoutError,
  WATER_TEMP_UNAVAILABLE,
} from "@rygine/omnilogic-local-sdk";

import {
  attachHeaterSwitch,
  attachHeaterThermostat,
} from "@/accessories/heater";

import { configXml } from "./fixtures";
import { attachment, read, recordingLog, set } from "./hap";
import { readySession, testSession } from "./session";

const metricConfigXml = () =>
  configXml().replace("<Units>Standard</Units>", "<Units>Metric</Units>");

// the pool heater's heat source cools
const coolingConfigXml = () =>
  configXml().replace(
    "<Shared-Equipment-System-ID>12</Shared-Equipment-System-ID>",
    "<Shared-Equipment-System-ID>12</Shared-Equipment-System-ID><Supports-Cooling>yes</Supports-Cooling>",
  );

const thermostat = async () => {
  const t = await readySession();
  const service = new Service.Thermostat("Pool Heater");
  const calls: string[] = [];
  const handle = attachHeaterThermostat(attachment(service, t.session), {
    bodyId: 1,
    autoOff: (on) => calls.push(on ? "arm" : "clear") > 0,
  });
  handle.update();
  // the first read finds the heater off and cancels nothing
  calls.length = 0;
  return { ...t, service, handle, calls };
};

describe("heater thermostat", () => {
  it("on a Metric panel still reads the wire as Fahrenheit, and displays in Celsius", async () => {
    const t = testSession({ config: metricConfigXml });
    await t.session.refresh();
    const service = new Service.Thermostat("Pool Heater");
    const handle = attachHeaterThermostat(attachment(service, t.session), {
      bodyId: 1,
    });
    handle.update();
    expect(read(service, Characteristic.TargetTemperature)).toBeCloseTo(
      28.9,
      1,
    );
    expect(read(service, Characteristic.TemperatureDisplayUnits)).toBe(
      Characteristic.TemperatureDisplayUnits.CELSIUS,
    );
    const props = service.getCharacteristic(
      Characteristic.TargetTemperature,
    ).props;
    expect(props.minValue).toBeCloseTo(12.8, 1);
    await set(service, Characteristic.TargetTemperature, 28);
    expect(t.sent.at(-1)?.params.data).toBe(82);
  });

  it("offers Off and Heat only, with the set point bounded by the config", async () => {
    const { service } = await thermostat();
    const target = service.getCharacteristic(
      Characteristic.TargetHeatingCoolingState,
    );
    expect(target.props.validValues).toEqual([0, 1]);
    const props = service.getCharacteristic(
      Characteristic.TargetTemperature,
    ).props;
    // 55°F and 94°F on the reference config's pool heater
    expect(props.minValue).toBeCloseTo(12.8, 1);
    expect(props.maxValue).toBeCloseTo(34.4, 1);
  });

  it("reads the set point and water temperature in Celsius", async () => {
    const { service } = await thermostat();
    expect(read(service, Characteristic.TargetTemperature)).toBeCloseTo(
      28.9,
      1,
    );
    expect(read(service, Characteristic.CurrentTemperature)).toBeCloseTo(
      28.9,
      1,
    );
    expect(read(service, Characteristic.TemperatureDisplayUnits)).toBe(1);
  });

  it("sends a set point rounded to the controller's whole degree and reports it back", async () => {
    const { service, sent } = await thermostat();
    await set(service, Characteristic.TargetTemperature, 29.4);
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIHeaterCmd",
      params: { poolId: 1, equipmentId: 4, data: 85 },
    });
    expect(read(service, Characteristic.TargetTemperature)).toBeCloseTo(
      29.4,
      1,
    );
  });

  it("clamps a set point outside the range", async () => {
    const { service, sent } = await thermostat();
    await set(service, Characteristic.TargetTemperature, 5);
    expect(sent.at(-1)?.params.data).toBe(55);
  });

  it("Heat enables the heater and Off disables it", async () => {
    const { service, sent } = await thermostat();
    await set(service, Characteristic.TargetHeatingCoolingState, 1);
    expect(sent.at(-1)).toMatchObject({
      name: "SetHeaterEnable",
      params: { data: 1 },
    });
    await set(service, Characteristic.TargetHeatingCoolingState, 0);
    expect(sent.at(-1)).toMatchObject({
      name: "SetHeaterEnable",
      params: { data: 0 },
    });
  });

  it("Heat arms the off timer and Off clears it", async () => {
    const { service, calls } = await thermostat();
    await set(service, Characteristic.TargetHeatingCoolingState, 1);
    await set(service, Characteristic.TargetHeatingCoolingState, 0);
    expect(calls).toEqual(["arm", "clear"]);
  });

  it("cancels the off timer once a read finds the heater off after it was on", async () => {
    const { service, handle, calls, telemetry, session } = await thermostat();
    await set(service, Characteristic.TargetHeatingCoolingState, 1);
    telemetry.virtualHeaters[0]!.enable = 1;
    await session.refresh();
    handle.update();
    telemetry.virtualHeaters[0]!.enable = 0;
    await session.refresh();
    handle.update();
    expect(calls).toEqual(["arm", "clear"]);
  });

  it("leaves the off timer alone when the heater is already on", async () => {
    const { service, calls, telemetry, session } = await thermostat();
    telemetry.virtualHeaters[0]!.enable = 1;
    await session.refresh();
    await set(service, Characteristic.TargetHeatingCoolingState, 1);
    expect(calls).toEqual([]);
  });

  it("arms the off timer even when the write fails", async () => {
    const { service, omni, calls } = await thermostat();
    vi.spyOn(omni, "command").mockRejectedValueOnce(new Error("timed out"));
    await expect(
      set(service, Characteristic.TargetHeatingCoolingState, 1),
    ).rejects.toBeDefined();
    expect(calls).toEqual(["arm"]);
  });

  it("keeps the last water temperature when the body reports the sentinel", async () => {
    const { service, handle, telemetry, session } = await thermostat();
    telemetry.filters[0]!.filterSpeed = 0;
    telemetry.bodiesOfWater[0]!.waterTemp = WATER_TEMP_UNAVAILABLE;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.CurrentTemperature)).toBeCloseTo(
      28.9,
      1,
    );
  });

  it("shows Heat while the appliance heats", async () => {
    const { service, handle, telemetry, session } = await thermostat();
    telemetry.virtualHeaters[0]!.enable = 1;
    telemetry.heaters[0]!.heaterState = 1;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.CurrentHeatingCoolingState)).toBe(1);
    expect(read(service, Characteristic.TargetHeatingCoolingState)).toBe(1);
  });

  it("sends no mode command on a heat source that cannot cool", async () => {
    const { service, sent } = await thermostat();
    await set(service, Characteristic.TargetHeatingCoolingState, 1);
    expect(sent.map((s) => s.name)).not.toContain("SetUIHeaterModeCmd");
  });

  it("in Auto shows cooling above the set point and heating below", async () => {
    const t = testSession({ config: coolingConfigXml });
    t.telemetry.virtualHeaters[0]!.enable = 1;
    t.telemetry.virtualHeaters[0]!.mode = 2;
    t.telemetry.heaters[0]!.heaterState = 1;
    t.telemetry.bodiesOfWater[0]!.waterTemp = 90;
    await t.session.refresh();
    const service = new Service.Thermostat("Pool Heater");
    const handle = attachHeaterThermostat(attachment(service, t.session), {
      bodyId: 1,
    });
    handle.update();
    // the fixture's pool's set point is 84°F
    expect(read(service, Characteristic.TargetHeatingCoolingState)).toBe(3);
    expect(read(service, Characteristic.CurrentHeatingCoolingState)).toBe(2);
    t.telemetry.bodiesOfWater[0]!.waterTemp = 80;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.CurrentHeatingCoolingState)).toBe(1);
  });

  it("offers Cool and Auto on a heat source that cools, and sets the mode", async () => {
    const t = testSession({ config: coolingConfigXml });
    t.telemetry.virtualHeaters[0]!.mode = 0;
    await t.session.refresh();
    const service = new Service.Thermostat("Pool Heater");
    const handle = attachHeaterThermostat(attachment(service, t.session), {
      bodyId: 1,
    });
    handle.update();
    expect(
      service.getCharacteristic(Characteristic.TargetHeatingCoolingState).props
        .validValues,
    ).toEqual([0, 1, 2, 3]);

    await set(service, Characteristic.TargetHeatingCoolingState, 2);
    expect(t.sent.slice(-2).map((s) => [s.name, s.params.data])).toEqual([
      ["SetUIHeaterModeCmd", 1],
      ["SetHeaterEnable", 1],
    ]);

    t.telemetry.virtualHeaters[0]!.enable = 1;
    t.telemetry.virtualHeaters[0]!.mode = 1;
    t.telemetry.heaters[0]!.heaterState = 1;
    await t.session.refresh();
    handle.update();
    expect(read(service, Characteristic.TargetHeatingCoolingState)).toBe(2);
    expect(read(service, Characteristic.CurrentHeatingCoolingState)).toBe(2);

    // the controller is already cooling: only the enable goes out
    const before = t.sent.length;
    await set(service, Characteristic.TargetHeatingCoolingState, 2);
    expect(t.sent.slice(before).map((s) => s.name)).toEqual([
      "SetHeaterEnable",
    ]);
  });
});

const heaterSwitch = async (setPoint?: number) => {
  const t = await readySession();
  const service = new Service.Switch("Pool Heater");
  const calls: string[] = [];
  const handle = attachHeaterSwitch(attachment(service, t.session), {
    bodyId: 1,
    setPoint,
    autoOff: (on) => calls.push(on ? "arm" : "clear") > 0,
  });
  handle.update();
  // the first read finds the heater off and cancels nothing
  calls.length = 0;
  return { ...t, service, handle, calls };
};

describe("heater switch", () => {
  it("cancels the off timer once a read finds the heater off after it was on", async () => {
    const { service, handle, calls, telemetry, session } = await heaterSwitch();
    await set(service, Characteristic.On, true);
    // a read from before the enable reached the controller
    telemetry.virtualHeaters[0]!.enable = 0;
    await session.refresh();
    handle.update();
    expect(calls).toEqual(["arm"]);
    telemetry.virtualHeaters[0]!.enable = 1;
    await session.refresh();
    handle.update();
    telemetry.virtualHeaters[0]!.enable = 0;
    await session.refresh();
    handle.update();
    expect(calls).toEqual(["arm", "clear"]);
  });

  it("leaves the off timer alone when the heater is already on", async () => {
    const { service, calls, telemetry, session } = await heaterSwitch();
    telemetry.virtualHeaters[0]!.enable = 1;
    await session.refresh();
    await set(service, Characteristic.On, true);
    expect(calls).toEqual([]);
  });

  it("logs what it sent, and that a refused set reverts", async () => {
    const t = await readySession();
    const { lines, log } = recordingLog();
    const service = new Service.Switch("Pool Heater");
    let armed = false;
    attachHeaterSwitch(attachment(service, t.session, log), {
      bodyId: 1,
      setPoint: 88,
      offAfter: 60,
      autoOff: (on) => {
        const had = armed;
        armed = on;
        return on || had;
      },
    });
    await set(service, Characteristic.On, true);
    expect(lines.at(-1)).toBe("Pool Heater: on at 88°F for 60 minutes");
    await set(service, Characteristic.On, false);
    expect(lines.slice(-2)).toEqual([
      "Pool Heater: timer canceled",
      "Pool Heater: off",
    ]);
    await set(service, Characteristic.On, false);
    expect(lines.at(-1)).toBe("Pool Heater: off");
    expect(lines.at(-2)).not.toBe("Pool Heater: timer canceled");
    vi.spyOn(t.omni, "command").mockRejectedValueOnce(new Error("timed out"));
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(lines.at(-1)).toBe(
      "Pool Heater failed, the tile reverts: Error: timed out",
    );
    vi.spyOn(t.omni, "command").mockRejectedValueOnce(
      new CommandFailedError({
        message: "Unable to turn the heater on",
        command: "SetHeaterEnable",
        attempts: 1,
        cause: new OmniTimeoutError("ACK not received"),
      }),
    );
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(lines.at(-1)).toBe(
      "Pool Heater failed, the tile reverts: CommandFailedError: Unable to turn the heater on (OmniTimeoutError: ACK not received)",
    );
  });

  it("reads on while the heater is enabled", async () => {
    const { service, handle, telemetry, session } = await heaterSwitch(88);
    expect(read(service, Characteristic.On)).toBe(false);
    telemetry.virtualHeaters[0]!.enable = 1;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("on sends the set point then the enable, and arms the off timer", async () => {
    const { service, sent, calls } = await heaterSwitch(88);
    const before = sent.length;
    await set(service, Characteristic.On, true);
    expect(sent.slice(before).map((s) => s.name)).toEqual([
      "SetUIHeaterCmd",
      "SetHeaterEnable",
    ]);
    expect(sent.at(-2)?.params).toMatchObject({ equipmentId: 4, data: 88 });
    expect(sent.at(-1)?.params).toMatchObject({ equipmentId: 4, data: 1 });
    expect(calls).toEqual(["arm"]);
  });

  it("holds the set point to the heater's range", async () => {
    const { service, sent } = await heaterSwitch(120);
    await set(service, Characteristic.On, true);
    expect(sent.at(-2)?.params.data).toBe(94);
  });

  it("with no set point of its own only enables the heater", async () => {
    const { service, sent } = await heaterSwitch();
    const before = sent.length;
    await set(service, Characteristic.On, true);
    expect(sent.slice(before).map((s) => s.name)).toEqual(["SetHeaterEnable"]);
  });

  it("arms the off timer even when the write fails", async () => {
    const { service, omni, calls } = await heaterSwitch(88);
    vi.spyOn(omni, "command").mockRejectedValueOnce(new Error("timed out"));
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(calls).toEqual(["arm"]);
  });

  it("off disables the heater and clears the off timer", async () => {
    const { service, sent, calls } = await heaterSwitch(88);
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)).toMatchObject({
      name: "SetHeaterEnable",
      params: { data: 0 },
    });
    expect(calls).toEqual(["clear"]);
  });
});

it("a tap after the heater leaves the controller is logged and reverts the tile", async () => {
  const t = await readySession();
  const { lines, log } = recordingLog();
  const service = new Service.Switch("Pool Heater");
  attachHeaterSwitch(attachment(service, t.session, log), { bodyId: 1 });
  vi.spyOn(t.omni.backyard, "body").mockReturnValue(undefined);
  await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
  expect(lines.at(-1)).toBe(
    "Pool Heater failed, the tile reverts: Error: no heater on body 1",
  );
});
