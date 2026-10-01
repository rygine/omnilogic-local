import type { IHomebridgePluginUi } from "@homebridge/plugin-ui-utils";

import {
  CATALOG,
  fitting,
  isTypeKey,
  nameFor,
  type Field,
  type Options,
  type Service,
  type TypeKey,
} from "@/catalog";
import {
  accessoryOf,
  equipmentFor,
  fitProblem,
  validHost,
  type Accessory,
  type ControllerConfig,
} from "@/config";
import type { Exposable } from "@/discovery";
import { isRecord } from "@/helpers";
import { ICONS, type IconKey } from "@/icons";

type Block = Partial<ControllerConfig>;

type PluginConfig = { name?: string; controllers?: Block[] };

// one field of the form and the controls it reads
type Control = {
  field: Field;
  input: HTMLInputElement | HTMLSelectElement;
  toggle?: HTMLInputElement;
};

const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
};

const icon = (key: IconKey, cls = "icon") => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 256 256");
  svg.setAttribute("class", cls);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICONS[key]);
  svg.append(path);
  return svg;
};

const iconButton = (cls: string, text: string, key: IconKey) =>
  h(
    "button",
    {
      type: "button",
      class: `btn btn-link btn-sm ${cls} p-0 text-body`,
      "aria-label": text,
      title: text,
    },
    icon(key, "icon icon-sm"),
  );

const label = (id: string, text: string) =>
  h("label", { for: id, class: "form-label" }, text);

// a control with its label above and any problem below
const field = (
  id: string,
  text: string,
  control: HTMLElement,
  cls = "",
  problem?: string | HTMLElement,
) => {
  control.id = id;
  const hint =
    typeof problem === "string"
      ? h("div", { class: "invalid-tooltip" }, problem)
      : problem;
  return h(
    "div",
    { class: `${cls} position-relative` },
    label(id, text),
    control,
    ...(hint === undefined ? [] : [hint]),
  );
};

// sections in this order, any other body after them
const BODY_ORDER = ["backyard", "pool", "spa", "themes"];
const bodyRank = (name: string) => {
  const i = BODY_ORDER.indexOf(name.toLowerCase());
  return i === -1 ? BODY_ORDER.length : i;
};
const bodies = (found: Exposable[]) =>
  [...new Set(found.map((f) => f.body))].toSorted(
    (a, b) => bodyRank(a) - bodyRank(b),
  );

const SENSOR_KINDS = ["waterTemp", "airTemp"];
// kinds that are not a piece of equipment of their own
const NOT_PIECES = ["theme", "spillover", ...SENSOR_KINDS];
const count = (n: number, one: string, many: string) =>
  n === 1 ? `a ${one}` : `${n} ${many}`;
// "Discovered 8 pieces of equipment, 2 sensors, and a theme."
const discoveredLine = (found: Exposable[]) => {
  const pieces = found.filter((f) => !NOT_PIECES.includes(f.kind)).length;
  const sensors = found.filter((f) => SENSOR_KINDS.includes(f.kind)).length;
  const themes = found.filter((f) => f.kind === "theme").length;
  const counted: [number, string, string][] = [
    [pieces, "piece of equipment", "pieces of equipment"],
    [sensors, "sensor", "sensors"],
    [themes, "theme", "themes"],
  ];
  const parts = counted
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => count(n, one, many));
  const words =
    parts.length === 0
      ? "nothing"
      : new Intl.ListFormat("en-US", { type: "conjunction" }).format(parts);
  return `Discovered ${words}.`;
};
// an entry's equipment, type, and settings, leaving out its id and name
const settingsOf = (x: Accessory) =>
  JSON.stringify(
    Object.entries(x)
      .filter(([k]) => k !== "id" && k !== "name")
      .toSorted(([k], [l]) => k.localeCompare(l)),
  );
const sameAccessory = (a: Accessory, b: Accessory) =>
  settingsOf(a) === settingsOf(b);

// a card's icon and the first word of its summary
const SERVICE_LOOK: Record<Service, [IconKey, string]> = {
  Fan: ["fan", "fan"],
  Switch: ["toggle", "switch"],
  Thermostat: ["thermometer", "thermostat"],
  Lightbulb: ["lightbulb", "light"],
  TemperatureSensor: ["thermometer", "temperature sensor"],
};

const makeId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

const keyOf = (eq: Exposable) => `${eq.kind}:${eq.id}`;

// a control's value, or the saved one clamped into range
const whole = (
  input: HTMLInputElement | HTMLSelectElement,
  min: number,
  max: number,
  saved: number,
) => {
  const n = Number(input.value);
  const ok = input.value !== "" && Number.isInteger(n) && n >= min && n <= max;
  input.classList.toggle("is-invalid", !ok);
  return ok ? n : Math.min(max, Math.max(min, saved));
};

export const mount = async (root: HTMLElement) => {
  // the Homebridge UI's helper, a global on the page
  const hb: IHomebridgePluginUi = window.homebridge;
  let config: PluginConfig = (await hb.getPluginConfig())[0] ?? {};
  const controllers = config.controllers ?? [];
  const current = controllers[0] ?? {};
  const accessories = [...(current.accessories ?? [])];
  let found: Exposable[] = [];

  const platformInput = h("input", {
    type: "text",
    class: "form-control",
    placeholder: "OmniLogicLocal",
  });
  platformInput.value = config.name ?? "OmniLogicLocal";
  const hostInput = h("input", {
    type: "text",
    class: "form-control",
    placeholder: "192.168.1.100",
  });
  hostInput.value = current.host ?? "";
  const portInput = h("input", {
    id: "port",
    type: "number",
    class: "form-control",
  });
  portInput.value = String(current.port ?? 10444);
  const pollInput = h("input", {
    id: "pollInterval",
    type: "number",
    class: "form-control",
    style: "max-width: 12rem",
    min: "30",
    step: "1",
    "aria-describedby": "pollInterval-words",
  });
  pollInput.value = String(current.pollInterval ?? 300);
  const pollWords = h("span", { id: "pollInterval-words" });
  const discoverButton = h(
    "button",
    { id: "discover", type: "button", class: "btn btn-primary" },
    "Discover",
  );

  // the refresh interval in words, such as "1 hour, 30 minutes"
  const words = () => {
    const t = pollInput.valueAsNumber;
    const parts: [number, string][] = [
      [Math.floor(t / 3600), "hour"],
      [Math.floor((t % 3600) / 60), "minute"],
      [t % 60, "second"],
    ];
    pollWords.textContent =
      Number.isInteger(t) && t >= 0
        ? parts
            .filter(([n]) => n > 0)
            .map(([n, unit]) => `${n} ${unit}${n === 1 ? "" : "s"}`)
            .join(", ")
        : "";
  };
  const host = () => hostInput.value.trim();
  const port = () => whole(portInput, 1, 65535, current.port ?? 10444);
  const enableDiscover = () => {
    const ok = validHost(host());
    discoverButton.disabled = !ok;
    if (!ok) {
      found = [];
      editing = undefined;
      clear();
    }
  };
  // saves the first controller block
  const commit = () => {
    if (!validHost(host())) {
      return;
    }
    const block: Block = {
      host: host(),
      port: port(),
      pollInterval: whole(pollInput, 30, 86400, current.pollInterval ?? 300),
      accessories,
    };
    config = {
      ...config,
      name: platformInput.value.trim() || "OmniLogicLocal",
    };
    void hb.updatePluginConfig([
      {
        platform: "OmniLogicLocal",
        ...config,
        controllers: [block, ...controllers.slice(1)],
      },
    ]);
  };

  const errorDetail = h("small", { class: "opacity-75" });
  const errorBlock = h(
    "div",
    { class: "alert alert-danger mt-3 mb-0", role: "alert" },
    h("h6", { class: "alert-heading mb-1" }, "Could not reach the controller"),
    h(
      "p",
      { class: "mb-1" },
      "Check the host and port, then press Discover to try again. Saved accessories are unchanged.",
    ),
    errorDetail,
  );
  errorBlock.hidden = true;
  const summary = h("div", { id: "summary", class: "mt-3" });
  const addButton = h(
    "button",
    { id: "add", type: "button", class: "btn btn-primary btn-sm" },
    "Add accessory",
  );
  const formSlot = h("div", { id: "form" });
  const list = h("div", { id: "list" });
  const section = h(
    "div",
    { class: "mt-3" },
    h(
      "div",
      { class: "d-flex justify-content-between align-items-center mb-2" },
      h("h5", { class: "mb-0" }, "Accessories"),
      addButton,
    ),
    formSlot,
    list,
  );
  section.hidden = true;

  // the accessory being edited in the form
  let editing: string | undefined;

  // what makes an entry invalid, undefined for a valid one
  const problemOf = (a: Accessory): string | undefined => {
    const entry = accessoryOf(a);
    if (typeof entry === "string") {
      return entry;
    }
    const why = fitProblem(entry, found);
    if (why !== undefined) {
      return why;
    }
    // the plugin keeps the first valid entry with an id
    const taken = accessories
      .slice(0, accessories.indexOf(a))
      .some(
        (b) => isRecord(b) && b.id === entry.id && problemOf(b) === undefined,
      );
    return taken ? `another accessory already uses id ${entry.id}` : undefined;
  };

  // the equipment a valid entry attaches to, undefined for an invalid one
  const equipmentOf = (a: Accessory) =>
    problemOf(a) === undefined ? equipmentFor(a, found) : undefined;

  const bodyLabel = (text: string) =>
    h(
      "div",
      { class: "section-label fw-semibold opacity-75 mt-3 mb-2" },
      text.toUpperCase(),
    );

  // the name of the entry's equipment, preferring the kind its type fits
  const titleOfInvalid = (a: Accessory) => {
    if (!isRecord(a)) {
      return "Unknown equipment";
    }
    const byId = found.filter((f) => f.id === a.equipment);
    const eq =
      byId.find((f) => isTypeKey(a.type) && f.kind === CATALOG[a.type].fits) ??
      byId[0];
    return eq?.defaultName ?? "Unknown equipment";
  };

  const card = (a: Accessory) => {
    const eq = equipmentOf(a);
    const kind =
      eq === undefined ? "" : SERVICE_LOOK[CATALOG[a.type].service][1];
    const does = eq === undefined ? "" : CATALOG[a.type].summary(eq, a);
    const problem = problemOf(a) ?? "";
    const quick =
      eq === undefined
        ? `${problem.charAt(0).toUpperCase()}${problem.slice(1)}.`
        : does === ""
          ? kind
          : `${kind} · ${does}`;
    const edit = iconButton("edit", "Edit", "pencil");
    const remove = iconButton("remove", "Remove", "trash");
    const row = h(
      "div",
      {
        class:
          "well accessory rounded d-flex align-items-center gap-3 px-3 py-2 mb-2",
      },
      icon(
        eq === undefined ? "warning" : SERVICE_LOOK[CATALOG[a.type].service][0],
      ),
      h(
        "div",
        {},
        h(
          "div",
          { class: "fw-semibold" },
          eq === undefined ? titleOfInvalid(a) : a.name,
        ),
        h("div", { class: "small opacity-75 summary" }, quick),
      ),
      h(
        "div",
        { class: "ms-auto d-flex gap-3" },
        ...(eq === undefined ? [remove] : [edit, remove]),
      ),
    );
    edit.addEventListener("click", () => {
      editing = a.id;
      render();
    });
    remove.addEventListener("click", () => {
      accessories.splice(accessories.indexOf(a), 1);
      commit();
      render();
    });
    return row;
  };

  const buildForm = (existing?: Accessory, chosen?: Exposable) => {
    const known = existing !== undefined;
    const equipmentSelect = h("select", { class: "form-select" });
    for (const body of bodies(found)) {
      const group = h("optgroup", { label: body.toUpperCase() });
      for (const eq of found.filter((f) => f.body === body)) {
        group.append(new Option(eq.defaultName, keyOf(eq)));
      }
      equipmentSelect.append(group);
    }
    const start = chosen ?? found[0];
    equipmentSelect.value = start === undefined ? "" : keyOf(start);
    equipmentSelect.disabled = known;
    const typeSelect = h("select", { class: "form-select" });
    typeSelect.disabled = known;
    const nameInput = h("input", { type: "text", class: "form-control" });
    const nameProblem = h("div", { class: "invalid-tooltip" });
    const fieldsRow = h("div", { style: "display: contents" });
    const note = h("div", { class: "small opacity-75 note mt-2" });
    const problem = h("div", {
      id: "f-problem",
      class: "small text-danger mt-2",
    });
    const saveButton = h(
      "button",
      { id: "f-save", type: "button", class: "btn btn-primary" },
      known ? "Save" : "Add",
    );
    const cancelButton = h(
      "button",
      { id: "f-cancel", type: "button", class: "btn btn-secondary" },
      "Cancel",
    );
    const form = h(
      "div",
      { class: "well rounded px-3 py-3 mb-3" },
      h(
        "div",
        { class: "d-flex flex-wrap gap-3" },
        field("f-equipment", "Equipment", equipmentSelect, "flex-grow-1"),
        field("f-type", "Accessory", typeSelect),
        field("f-name", "Name", nameInput, "flex-grow-1", nameProblem),
        fieldsRow,
      ),
      note,
      problem,
      h(
        "div",
        { class: "d-flex justify-content-end gap-2 mt-3" },
        cancelButton,
        saveButton,
      ),
    );

    // the name was typed by hand
    let typed = known;
    let controls: Control[] = [];
    const equipment = () =>
      found.find((f) => keyOf(f) === equipmentSelect.value);
    const type = (): TypeKey | undefined =>
      isTypeKey(typeSelect.value) ? typeSelect.value : undefined;
    const readOptions = (): Options => {
      const eq = equipment();
      const options: Options = {};
      if (eq === undefined) {
        return options;
      }
      for (const c of controls) {
        if (c.input.disabled) {
          continue;
        }
        if (c.field.control === "select") {
          // "" is the Current choice
          if (c.input.value !== "") {
            options[c.field.key] =
              c.field.value === "number"
                ? Number(c.input.value)
                : c.input.value;
          }
          continue;
        }
        const range = c.field.range?.(eq) ?? { min: 0, max: 100 };
        options[c.field.key] = whole(c.input, range.min, range.max, range.min);
      }
      return options;
    };
    const refresh = () => {
      const options = readOptions();
      const eq = equipment();
      for (const c of controls) {
        const enabled =
          (eq === undefined || (c.field.enabled?.(options, eq) ?? true)) &&
          c.toggle?.checked !== false;
        c.input.disabled = !enabled;
        if (!enabled) {
          c.input.classList.remove("is-invalid");
        }
      }
      const t = type();
      note.textContent =
        eq === undefined || t === undefined
          ? ""
          : (CATALOG[t].note?.(eq, options) ?? "");
      if (!typed && eq !== undefined && t !== undefined) {
        nameInput.value = nameFor(t, eq, readOptions());
      }
    };
    const startValue = (f: Field, eq: Exposable) => {
      const value = existing?.[f.key] ?? f.default?.(eq);
      return value === undefined ? "" : String(value);
    };
    const addControl = (f: Field, eq: Exposable) => {
      const id = `f-${f.key}`;
      if (f.control === "select") {
        const select = h("select", { class: "form-select" });
        const groups = new Map<string, HTMLElement>();
        for (const [value, text, group] of f.choices?.(eq) ?? []) {
          const option = new Option(text, value);
          if (group === undefined) {
            select.append(option);
            continue;
          }
          let optgroup = groups.get(group);
          if (optgroup === undefined) {
            optgroup = h("optgroup", { label: group });
            groups.set(group, optgroup);
            select.append(optgroup);
          }
          optgroup.append(option);
        }
        select.value = startValue(f, eq);
        select.addEventListener("change", refresh);
        controls.push({ field: f, input: select });
        return field(id, f.label, select);
      }
      const range = f.range?.(eq) ?? { min: 0, max: 100 };
      const input = h("input", {
        type: "number",
        class: "form-control",
        style: "max-width: 8rem",
        min: String(range.min),
        max: String(range.max),
      });
      input.value = startValue(f, eq);
      input.addEventListener("input", refresh);
      const bounds = `${range.min} to ${range.max}`;
      if (f.control === "number") {
        controls.push({ field: f, input });
        return field(id, f.label, input, "", bounds);
      }
      const toggle = h("input", {
        id: `${id}-on`,
        type: "checkbox",
        class: "form-check-input m-0",
      });
      toggle.checked = typeof existing?.[f.key] === "number";
      toggle.addEventListener("change", refresh);
      input.id = id;
      controls.push({ field: f, input, toggle });
      return h(
        "div",
        {},
        h(
          "label",
          {
            class: "form-label d-flex align-items-center gap-2",
            for: `${id}-on`,
          },
          toggle,
          f.label,
        ),
        h(
          "div",
          { class: "d-flex align-items-center gap-2 position-relative" },
          input,
          h("span", { class: "small" }, "minutes"),
          h("div", { class: "invalid-tooltip" }, bounds),
        ),
      );
    };
    const renderFields = () => {
      const eq = equipment();
      const t = type();
      controls = [];
      fieldsRow.replaceChildren();
      note.textContent = "";
      if (eq === undefined || t === undefined) {
        return;
      }
      for (const f of CATALOG[t].fields) {
        if (f.visible?.(eq) !== false) {
          fieldsRow.append(addControl(f, eq));
        }
      }
      refresh();
    };
    const fillTypes = () => {
      const eq = equipment();
      typeSelect.replaceChildren();
      if (eq === undefined) {
        return;
      }
      const types = fitting(eq);
      for (const k of types) {
        typeSelect.append(new Option(CATALOG[k].label, k));
      }
      typeSelect.value = existing?.type ?? types[0] ?? "";
    };

    nameInput.addEventListener("input", () => {
      typed = true;
      nameInput.classList.remove("is-invalid");
    });
    equipmentSelect.addEventListener("change", () => {
      fillTypes();
      renderFields();
    });
    typeSelect.addEventListener("change", renderFields);
    saveButton.addEventListener("click", () => {
      const eq = equipment();
      const t = type();
      if (eq === undefined || t === undefined) {
        return;
      }
      const options = readOptions();
      const name = nameInput.value.trim();
      const entry: Accessory = {
        ...options,
        id: existing?.id ?? makeId(),
        type: t,
        equipment: eq.id,
        name,
      };
      const others = accessories.filter(
        (a) => a !== existing && equipmentOf(a) !== undefined,
      );
      const sameName = others.some(
        (a) => a.name.trim().toLowerCase() === name.toLowerCase(),
      );
      const twin = others.some((a) => sameAccessory(a, entry));
      nameInput.classList.toggle("is-invalid", name === "" || sameName);
      nameProblem.textContent = sameName
        ? "Another accessory already has this name."
        : "Give the accessory a name.";
      problem.textContent =
        twin && name !== "" && !sameName
          ? "An accessory with this equipment, type, and settings already exists."
          : "";
      if (name === "" || twin || form.querySelector(".is-invalid") !== null) {
        return;
      }
      const at = existing === undefined ? -1 : accessories.indexOf(existing);
      if (at === -1) {
        accessories.push(entry);
      } else {
        accessories[at] = entry;
      }
      commit();
      closeForm();
    });
    cancelButton.addEventListener("click", closeForm);

    nameInput.value = existing?.name ?? "";
    fillTypes();
    renderFields();
    return form;
  };

  const cardOrForm = (a: Accessory) => {
    const eq = equipmentOf(a);
    return a.id === editing && eq !== undefined ? buildForm(a, eq) : card(a);
  };

  const render = () => {
    formSlot.replaceChildren();
    if (accessories.length === 0) {
      formSlot.append(
        h("p", { class: "opacity-75 mt-3 mb-0" }, "No accessories added yet."),
      );
    }
    addButton.disabled = editing !== undefined;
    section.hidden = found.length === 0;
    if (found.length === 0) {
      summary.replaceChildren(
        h(
          "p",
          { class: "opacity-75 mb-0" },
          "The controller reported no equipment.",
        ),
      );
      return;
    }
    summary.replaceChildren(
      h("p", { class: "mb-0" }, discoveredLine(found)),
      h(
        "p",
        { class: "mb-0" },
        "Click ",
        h("strong", {}, "Add accessory"),
        " to add HomeKit control for any of them.",
      ),
    );
    list.replaceChildren();
    for (const body of bodies(found)) {
      const mine = accessories.filter((a) => equipmentOf(a)?.body === body);
      if (mine.length > 0) {
        list.append(bodyLabel(body), ...mine.map(cardOrForm));
      }
    }
    const invalid = accessories.filter((a) => equipmentOf(a) === undefined);
    if (invalid.length > 0) {
      list.append(
        bodyLabel("Invalid"),
        h(
          "p",
          { class: "small opacity-75 mb-2" },
          "The plugin skips these saved accessories. Their equipment is no longer on the controller, or the config was edited by hand into something the plugin cannot use. Remove each one, and add it again if you still want it.",
        ),
        ...invalid.map(card),
      );
    }
  };
  const closeForm = () => {
    editing = undefined;
    render();
  };
  const clear = () => {
    summary.replaceChildren();
    formSlot.replaceChildren();
    list.replaceChildren();
    section.hidden = true;
  };
  const discover = async () => {
    errorBlock.hidden = true;
    if (!validHost(host())) {
      found = [];
      clear();
      return;
    }
    hb.showSpinner();
    try {
      found = await hb.request("/discover", { host: host(), port: port() });
      render();
    } catch (error) {
      found = [];
      const message = error instanceof Error ? error.message : String(error);
      clear();
      errorDetail.textContent = message;
      errorBlock.hidden = false;
    } finally {
      hb.hideSpinner();
    }
  };

  root.replaceChildren(
    field("name", "Name", platformInput),
    h(
      "div",
      { class: "small opacity-75 mt-1" },
      "The platform's name in the Homebridge log.",
    ),
    h(
      "p",
      { class: "mt-3 mb-3" },
      "Enter the controller's IP and hit Discover to find your pool's equipment.",
    ),
    h(
      "div",
      {
        style:
          "display: grid; grid-template-columns: 1fr 25% auto; gap: 0.5rem; align-items: end;",
      },
      field("host", "Host", hostInput),
      field("port", "Port", portInput, "", "1 to 65535"),
      h("div", {}, discoverButton),
      h(
        "div",
        {},
        label("pollInterval", "Refresh (seconds)"),
        h(
          "div",
          { class: "d-flex align-items-center gap-2 position-relative" },
          pollInput,
          h("div", { class: "invalid-tooltip" }, "At least 30 seconds"),
          pollWords,
        ),
      ),
    ),
    h(
      "div",
      { class: "small opacity-75 mt-1" },
      "Changes made from HomeKit show immediately.",
      h("br"),
      "Temperatures and changes made outside HomeKit update on the refresh interval.",
    ),
    errorBlock,
    summary,
    section,
  );
  words();
  enableDiscover();
  hostInput.addEventListener("input", enableDiscover);
  pollInput.addEventListener("input", words);
  for (const input of [platformInput, hostInput, portInput, pollInput]) {
    input.addEventListener("change", commit);
  }
  discoverButton.addEventListener("click", () => {
    void discover();
  });
  addButton.addEventListener("click", () => {
    closeForm();
    formSlot.replaceChildren(buildForm());
    addButton.disabled = true;
  });
  hb.hideSchemaForm();
  await discover();
};

const root = document.getElementById("omnilogic");
if (root !== null) {
  void mount(root);
}
