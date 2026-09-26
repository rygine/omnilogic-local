import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Characteristic, Service } from "@homebridge/hap-nodejs";
import { WATER_TEMP_UNAVAILABLE } from "@rygine/omnilogic-local-sdk";

import { attachAirSensor, attachWaterSensor } from "@/accessories/sensor";
import { Readings } from "@/persist";

import { attachment, read } from "./hap";
import { readySession, testSession } from "./session";

describe("temperature sensors", () => {
  it("reports water and air in Celsius", async () => {
    const t = await readySession();
    const water = new Service.TemperatureSensor("Pool Water");
    attachWaterSensor(attachment(water, t.session), { bodyId: 1 }).update();
    expect(read(water, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(water, Characteristic.StatusActive)).toBe(true);
    const air = new Service.TemperatureSensor("Air");
    attachAirSensor(attachment(air, t.session)).update();
    expect(read(air, Characteristic.CurrentTemperature)).toBeCloseTo(25.6, 1);
  });

  it("keeps the last reading and goes inactive while the pump is off", async () => {
    const t = await readySession();
    const water = new Service.TemperatureSensor("Pool Water");
    const handle = attachWaterSensor(attachment(water, t.session), {
      bodyId: 1,
    });
    handle.update();
    t.telemetry.filters[0]!.filterState = 0;
    t.telemetry.bodiesOfWater[0]!.waterTemp = WATER_TEMP_UNAVAILABLE;
    await t.session.refresh();
    handle.update();
    expect(read(water, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(water, Characteristic.StatusActive)).toBe(false);
  });

  it("a restart with the pump off shows the reading kept from before", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "omni-")), "readings.json");
    const before = new Readings(file);
    before.keep("water:1", 84);
    const t = testSession();
    t.telemetry.filters[0]!.filterState = 0;
    t.telemetry.bodiesOfWater[0]!.waterTemp = WATER_TEMP_UNAVAILABLE;
    await t.session.refresh();
    const water = new Service.TemperatureSensor("Pool Water");
    attachWaterSensor(
      attachment(water, t.session, undefined, new Readings(file)),
      { bodyId: 1 },
    ).update();
    expect(read(water, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(water, Characteristic.StatusActive)).toBe(false);
  });

  it("a pool holds its last reading while only the spa runs", async () => {
    const t = await readySession();
    const pool = new Service.TemperatureSensor("Pool Water");
    const handle = attachWaterSensor(attachment(pool, t.session), {
      bodyId: 1,
    });
    handle.update();
    t.telemetry.filters[0]!.filterState = 0;
    t.telemetry.bodiesOfWater[0]!.waterTemp = WATER_TEMP_UNAVAILABLE;
    t.telemetry.filters[1]!.filterState = 1;
    t.telemetry.bodiesOfWater[1]!.waterTemp = 100;
    await t.session.refresh();
    handle.update();
    expect(read(pool, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(pool, Characteristic.StatusActive)).toBe(false);
  });

  it("a spa whose pump is off shows the pool's reading", async () => {
    const t = await readySession();
    const spa = new Service.TemperatureSensor("Spa Water");
    attachWaterSensor(attachment(spa, t.session), { bodyId: 2 }).update();
    expect(read(spa, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(spa, Characteristic.StatusActive)).toBe(true);
  });

  it("goes inactive on the sentinel while a stopped filter still reports on", async () => {
    const t = await readySession();
    const water = new Service.TemperatureSensor("Pool Water");
    const handle = attachWaterSensor(attachment(water, t.session), {
      bodyId: 1,
    });
    handle.update();
    t.telemetry.filters[0]!.filterSpeed = 0;
    t.telemetry.bodiesOfWater[0]!.waterTemp = WATER_TEMP_UNAVAILABLE;
    await t.session.refresh();
    handle.update();
    expect(read(water, Characteristic.CurrentTemperature)).toBeCloseTo(28.9, 1);
    expect(read(water, Characteristic.StatusActive)).toBe(false);
  });
});
