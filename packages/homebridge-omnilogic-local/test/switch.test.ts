import { Characteristic, Service } from "@homebridge/hap-nodejs";

import { attachRelaySwitch, attachThemeSwitch } from "@/accessories/switch";

import { configXml, extraConfigXml } from "./fixtures";
import { attachment, read, recordingLog, set } from "./hap";
import { readySession, testSession } from "./session";

describe("relay switch", () => {
  it("drives a relay on the backyard itself with the backyard's id", async () => {
    const t = testSession({ config: extraConfigXml });
    await t.session.refresh();
    const service = new Service.Switch("Yard Lights");
    const handle = attachRelaySwitch(attachment(service, t.session), {
      relayId: 30,
    });
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 0, equipmentId: 30, isOn: 1 },
    });
  });

  it("reads and writes the relay", async () => {
    const t = await readySession();
    const service = new Service.Switch("Spa Blower");
    const handle = attachRelaySwitch(attachment(service, t.session), {
      relayId: 22,
    });
    handle.update();
    expect(read(service, Characteristic.On)).toBe(false);
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 2, equipmentId: 22, isOn: 1 },
    });
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("with a turn-off time, on carries the controller's countdown", async () => {
    const t = await readySession();
    const service = new Service.Switch("Spa Blower");
    attachRelaySwitch(attachment(service, t.session), {
      relayId: 22,
      offAfter: 90,
    });
    await set(service, Characteristic.On, true);
    expect(t.sent.at(-1)?.params).toMatchObject({
      equipmentId: 22,
      isOn: 1,
      isCountDownTimer: 1,
      endTimeHours: 1,
      endTimeMinutes: 30,
      daysActive: 127,
    });
    await set(service, Characteristic.On, false);
    expect(t.sent.at(-1)?.params).toMatchObject({
      isOn: 0,
      isCountDownTimer: 0,
    });
  });
});

const themeSwitch = async (offAfter?: number) => {
  const t = await readySession();
  const service = new Service.Switch("Party");
  const handle = attachThemeSwitch(attachment(service, t.session), {
    themeId: 29,
    offAfter,
  });
  handle.update();
  return { ...t, service, handle };
};

describe("theme switch", () => {
  it("refuses a tap once the controller no longer reports the theme", async () => {
    let xml = configXml();
    const t = testSession({ config: () => xml });
    await t.session.refresh();
    const { lines, log } = recordingLog();
    const service = new Service.Switch("Party Theme");
    attachThemeSwitch(attachment(service, t.session, log), { themeId: 29 });
    xml = xml.replace(/<Groups>[\s\S]*<\/Groups>/, "");
    // the controller announces a changed config through the checksum
    t.telemetry.backyard.configChksum += 1;
    await t.session.refresh();
    const before = t.sent.length;
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(t.sent.length).toBe(before);
    expect(lines.at(-1)).toBe(
      "Party Theme failed, the tile reverts: Error: the theme is no longer on the controller",
    );
  });

  it("logs the run and the stop", async () => {
    const t = await readySession();
    const { lines, log } = recordingLog();
    const service = new Service.Switch("Party");
    attachThemeSwitch(attachment(service, t.session, log), {
      themeId: 29,
      offAfter: 90,
    });
    await set(service, Characteristic.On, true);
    expect(lines.at(-1)).toBe("Party: run for 90 minutes");
    await set(service, Characteristic.On, false);
    expect(lines.at(-1)).toBe("Party: stop");
    vi.spyOn(t.omni, "command").mockRejectedValueOnce(new Error("timed out"));
    await expect(set(service, Characteristic.On, true)).rejects.toBeDefined();
    expect(lines.at(-1)).toBe(
      "Party failed, the tile reverts: Error: timed out",
    );
  });

  it("reads on while the theme reports running", async () => {
    const { service, handle, telemetry, session } = await themeSwitch();
    expect(read(service, Characteristic.On)).toBe(false);
    telemetry.themes[0]!.groupState = 1;
    await session.refresh();
    handle.update();
    expect(read(service, Characteristic.On)).toBe(true);
  });

  it("on runs the theme, off sends its stop", async () => {
    const { service, sent } = await themeSwitch();
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)).toMatchObject({
      name: "RunGroupCmd",
      params: { equipmentId: 29, data: 1, isCountDownTimer: 0 },
    });
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)).toMatchObject({
      name: "RunGroupCmd",
      params: { equipmentId: 29, data: 0 },
    });
  });

  it("with a turn-off time, the run carries the controller's countdown and the stop does not", async () => {
    const { service, sent } = await themeSwitch(90);
    await set(service, Characteristic.On, true);
    expect(sent.at(-1)?.params).toMatchObject({
      data: 1,
      isCountDownTimer: 1,
      endTimeHours: 1,
      endTimeMinutes: 30,
      daysActive: 127,
    });
    await set(service, Characteristic.On, false);
    expect(sent.at(-1)?.params).toMatchObject({ data: 0, isCountDownTimer: 0 });
  });
});
