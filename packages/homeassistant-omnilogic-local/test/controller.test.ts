import { timeOf } from "@/entities/schedules";

import { configXml, entity, ready } from "./omni";

describe("controller", () => {
  it("gives every number a step of at least 0.001, the smallest Home Assistant accepts", async () => {
    const { devices } = await ready();

    const tooFine = devices.flatMap((d) =>
      d.entities
        .filter(
          (e) =>
            e.platform === "number" &&
            typeof e.config?.step === "number" &&
            e.config.step < 0.001,
        )
        .map((e) => `${d.id}/${e.key}`),
    );

    expect(tooFine).toEqual([]);
  });

  it("names a schedule's switch and delete button after the schedule, and names sunrise and sunset", async () => {
    const { devices } = await ready();

    const enabled = entity(devices, "controller", "schedule_21_enabled");
    expect([enabled.platform, enabled.name, enabled.value!()]).toEqual([
      "switch",
      "Pool Filter Pump 10:00–18:00, every day, value 58",
      true,
    ]);
    const remove = entity(devices, "controller", "schedule_21_delete");
    expect([remove.platform, remove.name]).toEqual([
      "button",
      "Delete Pool Filter Pump 10:00–18:00, every day, value 58",
    ]);
    // a control, beside the schedule's switch, not a configuration entry
    expect(remove.config?.entity_category).toBeUndefined();

    expect([timeOf(25, 25), timeOf(26, 25), timeOf(7, 5)]).toEqual([
      "sunrise",
      "sunset",
      "07:05",
    ]);
  });

  it("ignores a schedule that runs once and a schedule that runs a theme", async () => {
    const { devices } = await ready({
      config: () =>
        configXml()
          .replace(
            /(<schedule-system-id>21<\/schedule-system-id>[\s\S]*?<recurring>)1(<\/recurring>)/,
            "$10$2",
          )
          .replace(
            /(<schedule-system-id>23<\/schedule-system-id>[\s\S]*?<event>)\d+(<\/event>)/,
            "$1317$2",
          ),
    });

    const keys = devices
      .find((d) => d.id === "controller")!
      .entities.map((e) => e.key);
    expect(keys.filter((k) => k.startsWith("schedule_"))).toEqual([]);
  });
});
