import { fitting } from "@/catalog";
import { accessoryOf, fitProblem } from "@/config";
import type { Exposable } from "@/discovery";
import { mount } from "@/ui/page";

import { installHomebridge } from "./harness";

const found: Exposable[] = [
  {
    id: 0,
    kind: "airTemp",
    body: "Backyard",
    bodyId: 0,
    defaultName: "Backyard Air Temperature Sensor",
  },
  {
    id: 3,
    kind: "filter",
    body: "Pool",
    bodyId: 1,
    defaultName: "Pool Filter Pump",
    minSpeed: 58,
    maxSpeed: 100,
    speedType: "variable",
    presets: { low: 58, medium: 80, high: 100 },
    lastSpeed: 80,
  },
  {
    id: 8,
    kind: "light",
    body: "Pool",
    bodyId: 1,
    defaultName: "Pool Color Lights",
    shows: [
      { value: 1, name: "DEEP_BLUE_SEA" },
      { value: 0, name: "VOODOO_LOUNGE" },
    ],
    omniDirect: true,
    speeds: ["Slow", "Medium", "Fast"],
    brightnesses: [20, 60, 100],
  },
  {
    id: 1,
    kind: "spillover",
    body: "Pool",
    bodyId: 1,
    defaultName: "Pool Spillover",
    minSpeed: 58,
    maxSpeed: 100,
    speedType: "variable",
    presets: { low: 58, medium: 80, high: 100 },
  },
  {
    id: 5,
    kind: "chlorinator",
    body: "Pool",
    bodyId: 1,
    defaultName: "Pool Chlorinator",
    output: 50,
  },
  { id: 29, kind: "theme", body: "Themes", defaultName: "Party" },
];

const second = {
  host: "192.168.1.101",
  port: 10444,
  pollInterval: 600,
  accessories: [],
};
const block = (accessories: Record<string, unknown>[] = []) => ({
  platform: "OmniLogicLocal",
  controllers: [
    { host: "192.168.1.100", port: 10444, pollInterval: 300, accessories },
    second,
  ],
});

type Saved = { controllers: { accessories: Record<string, unknown>[] }[] };

const query = (sel: string) => {
  const el = document.querySelector<HTMLElement>(sel);
  if (el === null) {
    throw new Error(`missing ${sel}`);
  }
  return el;
};
const click = (sel: string) => query(sel).click();
const fill = (sel: string, next: string) => {
  (query(sel) as HTMLInputElement).value = next;
  query(sel).dispatchEvent(new Event("input"));
};
const value = (sel: string) => (query(sel) as HTMLInputElement).value;
const change = (sel: string, next: string) => {
  (query(sel) as HTMLSelectElement).value = next;
  query(sel).dispatchEvent(new Event("change"));
};
const tick = () => new Promise((r) => setTimeout(r, 0));
// the block the page saved last, and its accessories
const last = (saved: unknown[]) => saved.at(-1) as Saved;
const kept = (saved: unknown[]) => last(saved).controllers[0]!.accessories;

describe("the settings page", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="omnilogic" class="card card-body"></div>';
  });

  it("summarizes the equipment, adds, edits, and removes accessories, and saves the block", async () => {
    const { saved } = installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();
    expect(query("#summary p:first-child").textContent).toBe(
      "Discovered 3 pieces of equipment, a sensor, and a theme.",
    );
    expect(query("#summary p:last-child").innerHTML).toBe(
      "Click <strong>Add accessory</strong> to add HomeKit control for any of them.",
    );

    expect(query("#form").textContent).toBe("No accessories added yet.");
    click("#add");
    expect(query("#form").textContent).not.toContain("No accessories");
    // cancel on the left, the action on the right
    expect(
      query("#f-cancel").compareDocumentPosition(query("#f-save")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    change("#f-equipment", "filter:3");
    change("#f-type", "filterSwitch");
    change("#f-onSpeed", "high");
    expect(value("#f-name")).toBe("Pool Filter Pump High");
    click("#f-save");
    await tick();
    const entry = kept(saved)[0]!;
    expect(entry).toMatchObject({
      type: "filterSwitch",
      equipment: 3,
      name: "Pool Filter Pump High",
      onSpeed: "high",
    });
    expect(typeof entry.id).toBe("string");
    expect(entry.id).not.toBe("");
    expect(document.querySelectorAll(".accessory").length).toBe(1);
    expect(query(".accessory .summary").textContent).toBe(
      "switch · turns on at high, 100%",
    );

    // one form at a time, and Add waits while one is open
    click("#add");
    click(".accessory .edit");
    expect(document.querySelectorAll("#f-save").length).toBe(1);
    expect((query("#add") as HTMLButtonElement).disabled).toBe(true);
    fill("#f-name", "Pump Fast");
    click("#f-save");
    await tick();
    expect(kept(saved)[0]!.name).toBe("Pump Fast");
    expect(last(saved).controllers[1]).toEqual(second);

    click(".accessory .remove");
    await tick();
    expect(kept(saved)).toEqual([]);
    expect(document.querySelectorAll(".accessory").length).toBe(0);
    expect(query("#form").textContent).toBe("No accessories added yet.");
  });

  it("groups a light's colors and shows, and disables speed for a color", async () => {
    installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();
    click("#add");
    expect((query("#add") as HTMLButtonElement).disabled).toBe(true);
    change("#f-equipment", "light:8");
    change("#f-type", "lightSwitch");
    expect(
      [...document.querySelectorAll("#f-show optgroup")].map((g) =>
        g.getAttribute("label"),
      ),
    ).toEqual(["Colors", "Light shows"]);
    change("#f-show", "1");
    expect((query("#f-speed") as HTMLSelectElement).disabled).toBe(true);
    change("#f-show", "0");
    expect((query("#f-speed") as HTMLSelectElement).disabled).toBe(false);
    click("#f-cancel");
    expect((query("#add") as HTMLButtonElement).disabled).toBe(false);
  });

  it("refuses a duplicate accessory and a duplicate name", async () => {
    const { saved } = installHomebridge(
      found,
      block([
        {
          id: "a1",
          type: "filterSwitch",
          equipment: 3,
          name: "Pool Filter Pump High",
          onSpeed: "high",
        },
      ]),
    );
    await mount(query("#omnilogic"));
    await tick();
    click("#add");
    change("#f-equipment", "filter:3");
    change("#f-type", "filterSwitch");
    change("#f-onSpeed", "high");
    fill("#f-name", "Another name");
    click("#f-save");
    await tick();
    expect(saved.length).toBe(0);
    expect(query("#f-problem").textContent).toContain("already exists");
    change("#f-onSpeed", "low");
    fill("#f-name", "pool filter pump high");
    click("#f-save");
    await tick();
    expect(saved.length).toBe(0);
    expect(query("#f-name").classList.contains("is-invalid")).toBe(true);
    expect(query("#f-problem").textContent).toBe("");
    expect(query("#f-name + .invalid-tooltip").textContent).toContain(
      "this name",
    );
    fill("#f-name", "Pool Filter Pump Low");
    click("#f-save");
    await tick();
    expect(kept(saved).length).toBe(2);
  });

  it("saves an option only when the form carries one", async () => {
    const { saved } = installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();

    click("#add");
    change("#f-equipment", "light:8");
    change("#f-type", "lightSwitch");
    click("#f-save");
    await tick();
    const entry = kept(saved)[0]!;
    expect(entry).toMatchObject({ type: "lightSwitch", equipment: 8, show: 1 });
    expect("speed" in entry).toBe(false);
    expect("brightness" in entry).toBe(false);
    expect("offAfter" in entry).toBe(false);

    click(".accessory .edit");
    click("#f-offAfter-on");
    click("#f-save");
    await tick();
    expect(kept(saved)[0]).toMatchObject({ offAfter: 60 });
  });

  it("blocks a save while a number is out of range", async () => {
    const { saved } = installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();

    click("#add");
    change("#f-equipment", "filter:3");
    change("#f-type", "filterSwitch");
    change("#f-onSpeed", "custom");
    fill("#f-onPercent", "999");
    click("#f-save");
    await tick();
    expect(saved.length).toBe(0);
    expect(query("#f-onPercent").classList.contains("is-invalid")).toBe(true);
    expect(query("#f-onPercent + .invalid-tooltip").textContent).toBe(
      "58 to 100",
    );
    expect(document.querySelectorAll(".accessory").length).toBe(0);
  });

  it("leaves the accessory alone when an edit is canceled", async () => {
    const { saved } = installHomebridge(
      found,
      block([
        {
          id: "keep1234",
          type: "themeSwitch",
          equipment: 29,
          name: "Party Theme",
        },
      ]),
    );
    await mount(query("#omnilogic"));
    await tick();

    click(".accessory .edit");
    fill("#f-name", "Renamed");
    click("#f-cancel");
    await tick();
    expect(saved.length).toBe(0);
    expect(document.querySelectorAll("#f-save").length).toBe(0);
    expect(query(".accessory").textContent).toContain("Party Theme");
  });

  it("hides the accessories while the host is not valid", async () => {
    installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();
    expect(query("#add").checkVisibility()).toBe(true);
    fill("#host", "not a host!");
    expect(query("#add").checkVisibility()).toBe(false);
  });

  it("owns the platform name", async () => {
    const { saved } = installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();
    expect(value("#name")).toBe("OmniLogicLocal");
    fill("#name", "Pool");
    change("#name", "Pool");
    await tick();
    expect((saved.at(-1) as { name?: string }).name).toBe("Pool");
    fill("#name", " ");
    change("#name", " ");
    await tick();
    expect((saved.at(-1) as { name?: string }).name).toBe("OmniLogicLocal");
  });

  it("names the platform on a first save", async () => {
    const { saved } = installHomebridge(found);
    await mount(query("#omnilogic"));
    await tick();
    change("#host", "192.168.1.100");
    await tick();
    expect(saved.at(-1)).toMatchObject({ platform: "OmniLogicLocal" });
  });

  it("enables Discover only for an IPv4 address or a host name", async () => {
    installHomebridge(found, {
      platform: "OmniLogicLocal",
      controllers: [
        { host: "", port: 10444, pollInterval: 300, accessories: [] },
      ],
    });
    await mount(query("#omnilogic"));
    await tick();
    const disabled = () => (query("#discover") as HTMLButtonElement).disabled;
    expect(disabled()).toBe(true);
    fill("#host", "192.168.1.100");
    expect(disabled()).toBe(false);
    fill("#host", "192.168.1.999");
    expect(disabled()).toBe(true);
    fill("#host", "omnilogic.local");
    expect(disabled()).toBe(false);
    fill("#host", "not a host!");
    expect(disabled()).toBe(true);
    fill("#host", "  ");
    expect(disabled()).toBe(true);
  });

  it("offers only Remove on an entry that is not valid", async () => {
    const { saved } = installHomebridge(
      found,
      block([
        { id: "typo1234", type: "filterfan", equipment: 3, name: "Typo" },
        { id: "gone1234", type: "relaySwitch", equipment: 99, name: "Jets" },
        {
          id: "show1234",
          type: "lightSwitch",
          equipment: 8,
          name: "L",
          show: 42,
        },
      ]),
    );
    await mount(query("#omnilogic"));
    await tick();
    expect(query("#list").textContent).toContain("INVALID");
    expect(query("#list").textContent).toContain(
      "The plugin skips these saved accessories.",
    );
    const cards = [...document.querySelectorAll(".accessory")];
    expect(cards.map((c) => c.textContent)).toEqual([
      'Pool Filter PumpType "filterfan" is not one the plugin knows.',
      "Unknown equipmentRelay 99 is not on the controller.",
      "Pool Color LightsShow 42 is not one of 1, 0.",
    ]);
    expect(document.querySelectorAll(".accessory .edit").length).toBe(0);
    click(".accessory .remove");
    await tick();
    expect(kept(saved).map((a) => a.id)).toEqual(["gone1234", "show1234"]);
  });

  it("flags an entry whose id an earlier entry uses, and an entry that is not a record", async () => {
    installHomebridge(
      found,
      block([
        { id: "dup", type: "filterFan", equipment: 3, name: "Pump" },
        { id: "dup", type: "chlorinatorFan", equipment: 5, name: "Salt" },
        null as never,
      ]),
    );
    await mount(query("#omnilogic"));
    await tick();
    const cards = [...document.querySelectorAll(".accessory")];
    expect(cards.map((c) => c.textContent)).toEqual([
      "Pumpfan · slider snaps to low 58%, medium 80%, and high 100%",
      "Pool ChlorinatorAnother accessory already uses id dup.",
      "Unknown equipmentNot an accessory entry.",
    ]);
  });

  it("builds only entries the plugin accepts", async () => {
    const { saved } = installHomebridge(found, block());
    await mount(query("#omnilogic"));
    await tick();
    let n = 0;
    for (const eq of found) {
      for (const type of fitting(eq)) {
        for (const timer of [false, true]) {
          click("#add");
          change("#f-equipment", `${eq.kind}:${eq.id}`);
          change("#f-type", type);
          const toggle =
            document.querySelector<HTMLInputElement>("#f-offAfter-on");
          if (timer && toggle === null) {
            click("#f-cancel");
            continue;
          }
          if (timer) {
            toggle?.click();
          }
          fill("#f-name", `Accessory ${n}`);
          n += 1;
          click("#f-save");
        }
      }
    }
    await tick();
    const entries = kept(saved);
    expect(entries.length).toBe(n);
    expect(entries.some((a) => typeof a.offAfter === "number")).toBe(true);
    for (const raw of entries) {
      const a = accessoryOf(raw);
      expect(typeof a === "string" ? a : fitProblem(a, found)).toBeUndefined();
    }
  });

  it("shows unsupported firmware as one line, and a network failure with its message", async () => {
    const firmware =
      "Firmware R0501000 is not supported: R0502000 or newer required.";
    installHomebridge(found, block(), {
      message: firmware,
      error: { status: 400, firmware: true },
    });
    await mount(query("#omnilogic"));
    await tick();
    expect(query('[role="alert"]').textContent).toBe(firmware);

    document.body.innerHTML =
      '<div id="omnilogic" class="card card-body"></div>';
    installHomebridge(found, block(), {
      message: "timed out",
      error: { status: 400 },
    });
    await mount(query("#omnilogic"));
    await tick();
    expect(query('[role="alert"]').textContent).toBe(
      "Could not reach the controllerCheck the host and port, then press Discover to try again. Saved accessories are unchanged.timed out",
    );
  });
});
