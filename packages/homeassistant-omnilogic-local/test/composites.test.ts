import { configXml, entity, ready, fixture, topics } from "./omni";

describe("composites", () => {
  it("reads a heat-only heater as a thermostat, turns it on and off, refuses cool, and exposes each heat source", async () => {
    const { devices, sent, telemetry } = await ready();
    const thermostat = entity(devices, "4", "thermostat");

    expect(thermostat.value!()).toEqual({
      mode: "off",
      target: 84,
      current: 84,
      action: "off",
    });
    expect(thermostat.topics!(topics)).toMatchObject({
      modes: ["off", "heat"],
      mode_command_topic: "set/mode",
      temperature_command_topic: "set/target",
      temperature_unit: "F",
    });

    await thermostat.command!("heat", "mode");
    expect(sent.at(-1)).toMatchObject({
      name: "SetHeaterEnable",
      params: { equipmentId: 4, data: 1 },
    });
    await thermostat.command!("off", "mode");
    expect(sent.at(-1)).toMatchObject({
      name: "SetHeaterEnable",
      params: { data: 0 },
    });
    await expect(thermostat.command!("cool", "mode")).rejects.toThrow(
      '"cool" is not a mode of this heater',
    );

    const state = entity(devices, "4", "source_5_state");
    expect(state.name).toBe("State");
    expect(state.config).toMatchObject({
      device_class: "enum",
      options: ["Off", "Idle", "Heating", "Paused", "Cooling Down"],
    });
    expect(state.value!()).toBe("Off");
    telemetry.virtualHeaters[0]!.enable = 1;
    expect(state.value!()).toBe("Idle");
    telemetry.heaters[0]!.heaterState = 1;
    expect(state.value!()).toBe("Heating");
    telemetry.heaters[0]!.heaterState = 3;
    expect(state.value!()).toBe("Cooling Down");
    const priority = entity(devices, "4", "source_5_priority");
    expect(priority.config).toMatchObject({
      options: [
        "Priority 1",
        "Priority 2",
        "Priority 3",
        "Priority 4",
        "Priority 5",
      ],
    });
    await priority.command!("Priority 2");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIHeaterPriorityCmd",
      params: { equipmentId: 5, data: 1 },
    });
  });

  it("reads a light, turns it on only when it is off, lists its shows as effects, refuses an unknown show, schedules a show then off, and adds brightness and show speed only in OmniDirect mode", async () => {
    const { devices, sent, telemetry } = await ready();
    const light = entity(devices, "8", "light");

    // the light moves the moment a power command reaches it
    const record = sent.push.bind(sent);
    sent.push = (...items) => {
      for (const s of items) {
        if (s.name === "SetUIEquipmentCmd" && s.params.equipmentId === 8) {
          telemetry.colorLogicLights[0]!.lightState = s.params.isOn ? 6 : 0;
        }
      }
      return record(...items);
    };

    await light.command!("ON");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 8, isOn: 1 },
    });
    // the ON Home Assistant sends after a show or brightness change
    const count = sent.length;
    await light.command!("ON");
    expect(sent.length).toBe(count);
    await light.command!("OFF");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 8, isOn: 0 },
    });

    expect(light.value!()).toMatchObject({ state: "OFF" });
    const discovery = light.topics!(topics);
    // an unknown show leaves the last effect in place
    expect(discovery.effect_value_template).toBe(
      "{{ value_json.light.effect or '' }}",
    );
    expect(discovery.effect_list).toEqual(
      expect.arrayContaining(["Voodoo Lounge", "USA"]),
    );
    expect(discovery.brightness_command_topic).toBeUndefined();
    expect(() => entity(devices, "8", "speed")).toThrow("no entity 8/speed");

    await expect(light.command!("Disco", "effect")).rejects.toThrow(
      '"Disco" is not a show of this light',
    );

    const schedule = devices.find((d) => d.id === "8")!.schedule!(6);
    expect(schedule).toEqual({
      start: [
        {
          key: "light",
          action: "light.turn_on",
          data: { effect: "Cloud White" },
        },
      ],
      end: [{ key: "light", action: "light.turn_off" }],
    });

    const power = entity(devices, "8", "power_state");
    expect(power.value!()).toBe("Off");
    expect(power.config).toMatchObject({
      device_class: "enum",
      options: expect.arrayContaining(["Active", "15 Seconds White"]),
    });

    const omniDirect = await ready({
      config: () =>
        configXml().replace(
          "<Networked>no</Networked>",
          "<Networked>no</Networked><V2-Active>yes</V2-Active>",
        ),
    });
    expect(
      entity(omniDirect.devices, "8", "light").topics!(topics)
        .brightness_command_topic,
    ).toBe("set/brightness");
    expect(
      entity(omniDirect.devices, "8", "speed").config?.entity_category,
    ).toBeUndefined();
    expect(entity(omniDirect.devices, "8", "speed").config).toMatchObject({
      options: expect.arrayContaining(["1x"]),
    });
  });

  it("names a chlorinator's clear alert, error, and conditions so Home Assistant does not read them as unknown", async () => {
    const { devices, telemetry } = await ready();

    expect(entity(devices, "6", "alert").value!()).toBe("No alert");
    expect(entity(devices, "6", "error").value!()).toBe("No error");
    expect(entity(devices, "13", "conditions").value!()).toBe("No conditions");

    telemetry.chlorinators[0]!.chlrAlert = 1;
    expect(entity(devices, "6", "alert").value!()).not.toBe("No alert");
  });

  it("reads a chlorinator's salt, switches it, and sets its output", async () => {
    const { devices, sent } = await ready();

    expect(entity(devices, "6", "average_salt").value!()).toBe(3000);
    expect(entity(devices, "6", "enabled").value!()).toBe(false);

    await entity(devices, "6", "enabled").command!("ON");
    expect(sent.at(-1)).toMatchObject({
      name: "SetCHLOREnable",
      params: { poolId: 1, data: 1 },
    });

    const output = entity(devices, "6", "output");
    expect(output.name).toBe("Output");
    expect(output.config?.entity_category).toBeUndefined();
    expect(output.config).toMatchObject({ unit_of_measurement: "%" });
    expect(entity(devices, "6", "conditions").config).toEqual({
      entity_category: "diagnostic",
    });
    await entity(devices, "6", "output").command!("30");
    expect(sent.at(-1)).toMatchObject({
      name: "SetCHLORTimePercent",
      params: { data: 30 },
    });
  });

  it("reads a cell's current and temperatures from its one measurement read", async () => {
    const { devices } = await ready();
    const current = entity(devices, "6", "cell_current");

    expect(current.value).toBeUndefined();
    expect(current.commandRead).toBeUndefined();
    expect(current.topics!(topics)).toEqual({
      state_topic: "s",
      value_template:
        "{{ value_json.cell_measurement.current if value_json.cell_measurement else None }}",
    });
    expect(entity(devices, "6", "cell_temperature").config).toMatchObject({
      entity_category: "diagnostic",
      unit_of_measurement: "°F",
      state_class: "measurement",
    });
  });

  it("makes a chlorinator's output unavailable outside Timed mode", async () => {
    const { devices, telemetry } = await ready();
    const output = entity(devices, "6", "output");

    expect(output.value!()).toEqual({ value: 10, usable: true });
    expect(output.topics!(topics)).toMatchObject({
      value_template: "{{ value_json.output.value }}",
      availability: [
        { topic: "bridge" },
        {
          topic: "s",
          value_template:
            "{{ 'online' if value_json.output.usable else 'offline' }}",
        },
      ],
      availability_mode: "all",
    });

    telemetry.chlorinators[0]!.operatingMode = 2;
    expect(output.value!()).toEqual({ value: 10, usable: false });
  });

  it("sets a heater's solar set point only when a solar source is fitted, and cools with a source that can", async () => {
    const { devices, sent, telemetry } = await ready({
      config: () => fixture("config-extra.xml"),
    });
    telemetry.virtualHeaters[0]!.solarSetPoint = 88;

    const thermostat = entity(devices, "4", "thermostat");
    await thermostat.command!("cool", "mode");
    expect(sent.slice(-2)).toMatchObject([
      { name: "SetUIHeaterModeCmd", params: { equipmentId: 4, data: 1 } },
      { name: "SetHeaterEnable", params: { data: 1 } },
    ]);
    telemetry.virtualHeaters[0]!.enable = 1;
    telemetry.virtualHeaters[0]!.mode = 1;
    telemetry.heaters[0]!.heaterState = 1;
    expect(thermostat.value!()).toMatchObject({
      mode: "cool",
      action: "cooling",
    });
    telemetry.virtualHeaters[0]!.mode = 0;
    expect(thermostat.value!()).toMatchObject({
      mode: "heat",
      action: "heating",
    });
    expect(
      ["source_5_state", "source_26_state"].map(
        (key) => entity(devices, "4", key).name,
      ),
    ).toEqual(["Gas state", "Solar state"]);

    const solar = entity(devices, "4", "solar_set_point");
    expect(solar.value!()).toBe(88);
    // converted to Home Assistant's own unit
    expect(solar.config).toMatchObject({ device_class: "temperature" });
    // Home Assistant's own unit, converted to °F, rounded to a whole degree
    await solar.command!("82.4");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUISolarSetPointCmd",
      params: { equipmentId: 4, data: 82 },
    });

    const plain = await ready();
    expect(() => entity(plain.devices, "4", "solar_set_point")).toThrow(
      "no entity 4/solar_set_point",
    );
  });

  it("reads a CSAD's alarm limits and pH calibration, and makes its ORP target unavailable unless the body's chlorinator is in ORP Auto mode", async () => {
    const { devices } = await ready({
      config: () => fixture("config-extra.xml"),
    });

    expect(entity(devices, "32", "orp_low_alarm").value!()).toBe(350);
    expect(entity(devices, "32", "orp_high_alarm").value!()).toBe(950);
    expect(entity(devices, "32", "ph_calibration").value!()).toBe(-1);
    expect(entity(devices, "32", "orp_low_alarm").config).toMatchObject({
      entity_category: "diagnostic",
    });
    expect(entity(devices, "32", "orp_target").value!()).toMatchObject({
      usable: false,
    });
  });

  it("sets chemistry targets from config-extra", async () => {
    const { devices, sent } = await ready({
      config: () => fixture("config-extra.xml"),
    });

    await entity(devices, "32", "ph_target").command!("7.4");
    expect(sent.at(-1)).toMatchObject({
      name: "UISetCSADTargetValue",
      params: { equipmentId: 32 },
    });

    await entity(devices, "32", "orp_target").command!("650");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUICSADORPTargetLevel",
      params: { data: 650 },
    });
  });
});
