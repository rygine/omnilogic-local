import type { OmniLogic, WriteOptions } from "@/client/omnilogic";
import type { ScheduleCreate } from "@/equipment/schedules";
import { countdownParams, timerParams } from "@/utils/command";
import { OmniValidationError } from "@/utils/errors";

export class Themes {
  #omni: OmniLogic;

  constructor(omni: OmniLogic) {
    this.#omni = omni;
  }

  list() {
    return this.#omni.config.themes;
  }

  // any body's id will do
  get #groupFields() {
    const [body] = this.#omni.config.backyard.bodiesOfWater;
    if (body === undefined) {
      throw new OmniValidationError("No body of water in the cached config");
    }
    return { daysActive: 0, recurring: 0, poolId: body.systemId };
  }

  get activeIds() {
    return this.#omni.telemetry.themes
      .filter((g) => g.groupState !== 0)
      .map((g) => g.systemId);
  }

  get(themeId: number) {
    return this.list().find((g) => g.systemId === themeId);
  }

  async create(name: string, options: WriteOptions = {}) {
    // names come back from the controller trimmed
    name = name.trim();
    const before = new Set(this.list().map((g) => g.systemId));
    const created = () =>
      this.list().find((g) => !before.has(g.systemId) && g.name === name);
    await this.#omni.command(
      "SaveNewGroupCmd",
      { name, ...this.#groupFields },
      {
        verify: () => created() !== undefined,
        attempts: options.attempts,
        failure: `Unable to create theme "${name}"`,
      },
    );
    return created()!;
  }

  async rename(themeId: number, name: string, options: WriteOptions = {}) {
    name = name.trim();
    if (this.list().some((g) => g.systemId !== themeId && g.name === name)) {
      throw new OmniValidationError(`A theme named "${name}" already exists`);
    }
    await this.#omni.command(
      "SetGroupCmd",
      { equipmentId: themeId, name, ...this.#groupFields },
      {
        verify: () => this.get(themeId)?.name === name,
        attempts: options.attempts,
        failure: `Unable to rename theme ${themeId} to "${name}"`,
      },
    );
  }

  async run(
    themeId: number,
    on = true,
    { minutes }: { minutes?: number } = {},
  ) {
    await this.#omni.command("RunGroupCmd", {
      equipmentId: themeId,
      data: on ? 1 : 0,
      ...(on && minutes !== undefined
        ? countdownParams(minutes)
        : timerParams()),
    });
  }

  schedule(
    themeId: number,
    window: Omit<ScheduleCreate, "equipmentId" | "data" | "type">,
  ) {
    return this.#omni.backyard.schedules.create({
      ...window,
      equipmentId: themeId,
      data: 1,
      type: "theme",
    });
  }

  async remove(themeId: number, options: WriteOptions = {}) {
    if (this.get(themeId) === undefined) {
      throw new OmniValidationError(`No theme ${themeId} in the cached config`);
    }
    await this.#omni.command(
      "DeleteGroupCmd",
      { equipmentId: themeId },
      {
        verify: () => this.get(themeId) === undefined,
        attempts: options.attempts,
        failure: `Unable to delete theme ${themeId}`,
      },
    );
  }
}
