import type { OmniLogic } from "@/client/omnilogic";
import { isRunning } from "@/constants/labels";
import { OmniLogicError, ReadingUnavailableError } from "@/utils/errors";
import { systemIdAt, type InventoryPath } from "@/utils/inventory";

export class Device {
  #poolId: number;
  #equipmentId: number;
  #name: string;
  #omni: OmniLogic;

  constructor(
    omni: OmniLogic,
    poolId: number,
    equipmentId: number,
    name: string,
  ) {
    this.#omni = omni;
    this.#poolId = poolId;
    this.#equipmentId = equipmentId;
    this.#name = name;
  }

  get omni() {
    return this.#omni;
  }

  // the body of water this one belongs to
  get poolId() {
    return this.#poolId;
  }

  get equipmentId() {
    return this.#equipmentId;
  }

  get name() {
    return this.#name;
  }

  get running() {
    return isRunning(this.omni.telemetry.backyard.state);
  }

  // this device's body in the cached config
  get bodyConfig() {
    return this.omni.config.backyard.bodiesOfWater.find(
      (b) => b.systemId === this.poolId,
    );
  }

  // this device's body in the inventory
  get inventoryBody() {
    const found = this.omni.inventory.bodies.find(
      (b) => b.systemId === this.poolId,
    );
    if (found === undefined) {
      throw new OmniLogicError(`No inventory for "${this.name}"`);
    }
    return found;
  }

  // a part's system id, or this device's id
  idAt(path: InventoryPath) {
    return systemIdAt(this.inventoryBody, path) ?? this.equipmentId;
  }

  requireRunning() {
    if (!this.running) {
      throw new ReadingUnavailableError({
        name: this.name,
        backyardState: this.omni.telemetry.backyard.state,
      });
    }
  }

  // whether the controller is on and reports this device
  reportedIn(list: { systemId: number }[]) {
    return this.running && list.some((r) => r.systemId === this.equipmentId);
  }

  // a config node of this device, which must be there
  configured<T>(node: T | undefined): T {
    if (node === undefined) {
      throw new OmniLogicError(`No configuration for "${this.name}"`);
    }
    return node;
  }

  telemetry<T extends { systemId: number }>(list: T[]) {
    const found = list.find((r) => r.systemId === this.equipmentId);
    if (found === undefined) {
      throw new OmniLogicError(`No telemetry for "${this.name}"`);
    }
    return found;
  }
}
