import { configXml, entity, ready, topics } from "./omni";

describe("equipment", () => {
  it("gives a variable-speed pump an on/off switch that starts at its last speed, a speed slider, and its Low, Medium, and High presets", async () => {
    const { devices, sent, telemetry } = await ready();
    const power = entity(devices, "3", "switch");

    expect([power.platform, power.name, power.value!()]).toEqual([
      "switch",
      null,
      true,
    ]);
    await power.command!("ON");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { equipmentId: 3, isOn: 80 },
    });
    await power.command!("OFF");
    expect(sent.at(-1)).toMatchObject({ params: { isOn: 0 } });

    // a last speed outside the pump's range starts it at its low preset
    telemetry.filters[0]!.lastSpeed = 20;
    await power.command!("ON");
    expect(sent.at(-1)).toMatchObject({ params: { isOn: 58 } });

    expect(
      ["preset_low", "preset_medium", "preset_high"].map(
        (key) => entity(devices, "3", key).name,
      ),
    ).toEqual(["Low", "Medium", "High"]);
    // each preset's speed is an attribute, a percent
    const low = entity(devices, "3", "preset_low");
    expect(low.value!()).toBe(58);
    expect(low.topics!(topics)).toMatchObject({
      state_topic: undefined,
      json_attributes_topic: "s",
      json_attributes_template:
        '{{ {"speed": value_json.preset_low} | tojson }}',
    });
    await entity(devices, "3", "preset_medium").command!("PRESS");
    expect(sent.at(-1)).toMatchObject({ params: { isOn: 80 } });
    expect(entity(devices, "3", "speed").platform).toBe("number");

    // paused while the other body's pump runs, so not turning
    telemetry.filters[0]!.filterState = 7;
    telemetry.filters[0]!.filterSpeed = 0;
    expect(power.value!()).toBe(false);
  });

  it("gives a dual-speed pump a switch and an Off, Low, High select, and a single-speed pump only a switch that starts it at its maximum", async () => {
    const typed = (type: string) =>
      ready({
        config: () =>
          configXml().replace(
            "<Filter-Type>FMT_VARIABLE_SPEED_PUMP</Filter-Type>",
            `<Filter-Type>${type}</Filter-Type>`,
          ),
      });

    const dual = await typed("FMT_DUAL_SPEED");
    const select = entity(dual.devices, "3", "speed_preset");
    expect([select.platform, select.config?.options]).toEqual([
      "select",
      ["Off", "Low", "High"],
    ]);
    await select.command!("Low");
    expect(dual.sent.at(-1)).toMatchObject({ params: { isOn: 50 } });
    await select.command!("High");
    expect(dual.sent.at(-1)).toMatchObject({ params: { isOn: 100 } });
    // a last speed outside the pump's range starts it at Low
    dual.telemetry.filters[0]!.lastSpeed = 0;
    await entity(dual.devices, "3", "switch").command!("ON");
    expect(dual.sent.at(-1)).toMatchObject({ params: { isOn: 50 } });
    expect(() => entity(dual.devices, "3", "speed")).toThrow(
      "no entity 3/speed",
    );
    expect(() => entity(dual.devices, "3", "preset_low")).toThrow(
      "no entity 3/preset_low",
    );
    expect(dual.devices.find((d) => d.id === "3")!.schedule!(100)).toEqual({
      start: [
        {
          key: "speed_preset",
          action: "select.select_option",
          data: { option: "High" },
        },
      ],
      end: [
        {
          key: "speed_preset",
          action: "select.select_option",
          data: { option: "Off" },
        },
      ],
    });

    const single = await typed("FMT_SINGLE_SPEED");
    await entity(single.devices, "3", "switch").command!("ON");
    expect(single.sent.at(-1)).toMatchObject({ params: { isOn: 100 } });
    expect(() => entity(single.devices, "3", "speed")).toThrow(
      "no entity 3/speed",
    );
    expect(() => entity(single.devices, "3", "speed_preset")).toThrow(
      "no entity 3/speed_preset",
    );
    expect(single.devices.find((d) => d.id === "3")!.schedule!(100)).toEqual({
      start: [{ key: "switch", action: "switch.turn_on" }],
      end: [{ key: "switch", action: "switch.turn_off" }],
    });
  });

  it("reads each body's flow from its filter pump's speed, and unknown without the pump's telemetry", async () => {
    const { devices, telemetry } = await ready();
    // the controller reports this with the spa's pump stopped
    telemetry.bodiesOfWater[1]!.flow = 1;

    expect(entity(devices, "1", "flow").platform).toBe("binary_sensor");
    expect(entity(devices, "1", "flow").value!()).toBe(true);
    expect(entity(devices, "2", "flow").value!()).toBe(false);

    telemetry.filters[0]!.filterSpeed = 0;
    expect(entity(devices, "1", "flow").value!()).toBe(false);

    telemetry.filters.splice(0, 1);
    expect(entity(devices, "1", "flow").value!()).toBeUndefined();
  });

  it("names equipment after its body, reads a body, and offers spillover only on a pool sharing its equipment", async () => {
    const { devices, sent } = await ready();

    expect(devices.map((d) => [d.id, d.name])).toEqual(
      expect.arrayContaining([
        ["1", "Pool"],
        ["3", "Pool Filter Pump"],
        ["10", "Spa Filter Pump"],
        ["22", "Spa Blower"],
      ]),
    );

    expect(entity(devices, "1", "water_temperature").value!()).toBe(84);
    expect(entity(devices, "1", "spillover_allowed").value!()).toBe(true);
    await entity(devices, "1", "spillover_allowed").command!("OFF");
    expect(sent.at(-1)).toMatchObject({
      name: "SetSpaSpilloverEnable",
      params: { poolId: 1, data: 0 },
    });

    const spillover = entity(devices, "1", "spillover");
    expect(spillover.value!()).toBe(0);
    await spillover.command!("60");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUISpilloverCmd",
      params: { poolId: 1, data: 60 },
    });
    expect(() => entity(devices, "2", "spillover")).toThrow(
      "no entity 2/spillover",
    );
  });

  it("keeps every speed control in percent, and adds a read-only Speed (RPM) unless the speed unit is percent", async () => {
    const rpm = await ready();
    for (const [id, key] of [
      ["3", "speed"],
      ["3", "min_speed"],
      ["3", "max_speed"],
      ["3", "freeze_protect_speed"],
      ["1", "spillover"],
      ["4", "low_speed"],
    ]) {
      const e = entity(rpm.devices, id!, key!);
      expect([key, e.topics, e.config]).toMatchObject([
        key,
        undefined,
        { min: 0, max: 100, unit_of_measurement: "%" },
      ]);
    }

    const speedRpm = entity(rpm.devices, "3", "speed_rpm");
    expect(speedRpm.platform).toBe("sensor");
    expect(speedRpm.command).toBeUndefined();
    // 58% of the pump's 3450 RPM, to the nearest 10
    expect(speedRpm.value!()).toBe(2000);

    const percent = await ready({ speedUnit: "percent" });
    expect(() => entity(percent.devices, "3", "speed_rpm")).toThrow(
      "no entity 3/speed_rpm",
    );
  });

  it("reads a filter, writes each setting through the SDK, and schedules a speed then off", async () => {
    const { devices, sent } = await ready();

    expect(entity(devices, "3", "speed").value!()).toBe(58);
    expect(entity(devices, "3", "power").value!()).toBe(1);
    expect(entity(devices, "3", "valve_position").value!()).toBe("Unknown");
    expect(entity(devices, "3", "priming").value!()).toBe(false);

    const cases: [string, string, string, Record<string, number>?][] = [
      ["min_speed", "40", "SetFilterLowSpeed"],
      ["max_speed", "90", "SetFilterHighSpeed"],
      ["priming_duration", "180", "SetPrimingDuration"],
      ["cooldown_duration", "300", "SetCooldownDuration"],
      ["shared_filter_timeout", "600", "SetSharedFilterTimeout"],
      [
        "freeze_protect_override_interval",
        "1800",
        "SetUIFreezeProtectOverrideInterval",
      ],
      ["freeze_protect", "ON", "SetFreezeProtect"],
      // rounded to a whole degree
      [
        "freeze_protect_temperature",
        "37.4",
        "SetFreezeProtectTemp",
        { data: 37 },
      ],
      ["freeze_protect_speed", "50", "SetFreezeProtectSpeed"],
      ["flow_monitor", "OFF", "SetFlowMonitor"],
      ["off_during_valve_change", "ON", "SetFilterOffValveChg"],
    ];
    for (const [key, payload, name, params = {}] of cases) {
      await entity(devices, "3", key).command!(payload);
      expect([key, sent.at(-1)]).toMatchObject([key, { name, params }]);
    }

    expect(devices.find((d) => d.id === "3")!.schedule!(58)).toEqual({
      start: [
        { key: "speed", action: "number.set_value", data: { value: 58 } },
      ],
      end: [{ key: "switch", action: "switch.turn_off" }],
    });
  });

  it("switches a relay, and opens and closes one made a valve actuator", async () => {
    const { devices, sent } = await ready();
    const blower = entity(devices, "22", "switch");

    expect(blower.value!()).toBe(false);
    await blower.command!("ON");
    expect(sent.at(-1)).toMatchObject({
      name: "SetUIEquipmentCmd",
      params: { poolId: 2, equipmentId: 22, isOn: 1 },
    });

    const actuator = await ready({
      config: () =>
        configXml().replace(
          "<Type>RLY_HIGH_VOLTAGE_RELAY</Type>",
          "<Type>RLY_VALVE_ACTUATOR</Type>",
        ),
    });
    const valve = entity(actuator.devices, "22", "valve");
    expect(valve.value!()).toBe("closed");
    await valve.command!("OPEN");
    expect(actuator.sent.at(-1)?.params).toMatchObject({
      equipmentId: 22,
      isOn: 1,
    });
    await expect(valve.command!("STOP")).rejects.toThrow(
      '"STOP" is not one of OPEN, CLOSE',
    );

    const smart = await ready({
      config: () =>
        configXml().replace(
          "<Type>RLY_HIGH_VOLTAGE_RELAY</Type>",
          "<Type>RLY_SMART_VALVE_ACTUATOR</Type>",
        ),
    });
    expect(entity(smart.devices, "22", "valve").platform).toBe("valve");
  });
});
