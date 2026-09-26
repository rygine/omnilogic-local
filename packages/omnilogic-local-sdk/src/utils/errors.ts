import { SYSTEM_STATE } from "@/constants/labels";
import type { Inventory } from "@/utils/inventory";

const stateName = (state: number) => SYSTEM_STATE[state] ?? String(state);

export class OmniLogicError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OmniLogicError";
  }
}

export class OmniTimeoutError extends OmniLogicError {
  constructor(message: string) {
    super(message);
    this.name = "OmniTimeoutError";
  }
}

export class OmniValidationError extends OmniLogicError {
  constructor(message: string) {
    super(message);
    this.name = "OmniValidationError";
  }
}

export class CommandFailedError extends OmniLogicError {
  command: string;
  attempts: number;

  constructor(details: {
    message: string;
    command: string;
    attempts: number;
    cause?: unknown;
  }) {
    super(details.message, { cause: details.cause });
    this.name = "CommandFailedError";
    this.command = details.command;
    this.attempts = details.attempts;
  }
}

export class ReadingUnavailableError extends OmniLogicError {
  backyardState: number;

  constructor(details: { name: string; backyardState: number }) {
    super(
      `"${details.name}" telemetry is not reliable while the controller is not in normal operating state (state: ${stateName(details.backyardState)})`,
    );
    this.name = "ReadingUnavailableError";
    this.backyardState = details.backyardState;
  }
}

export class SystemStateError extends OmniLogicError {
  command: string;
  backyardState: number;

  constructor(details: { command: string; backyardState: number }) {
    super(
      `${details.command} refused: the controller must be in a normal operating state (state: ${stateName(details.backyardState)}).\n\nPass { force: true } to ignore this error.`,
    );
    this.name = "SystemStateError";
    this.command = details.command;
    this.backyardState = details.backyardState;
  }
}

export class FirmwareTooOldError extends OmniLogicError {
  version: string;
  minimum: string;

  constructor(details: { version: string; minimum: string }) {
    super(
      `This controller reports firmware ${details.version}, below the ${details.minimum} this library was built against, so nothing it sends can be trusted.\n\nPass { force: true } to refresh() or command() to ignore this error; fetchTelemetry() works either way.`,
    );
    this.name = "FirmwareTooOldError";
    this.version = details.version;
    this.minimum = details.minimum;
  }
}

export class EquipmentNotInstalledError extends OmniLogicError {
  command: string;
  requirement: string;
  poolId: number;
  hint: string | undefined;
  inventory: Inventory;

  constructor(details: {
    command: string;
    requirement: string;
    poolId: number;
    hint?: string;
    inventory: Inventory;
  }) {
    const why =
      details.hint ??
      (details.requirement === "body"
        ? `no body of water with id ${details.poolId}`
        : `${details.requirement} is absent on body ${details.poolId}`);
    super(
      `${details.command} refused: ${why}.\n\nPass { force: true } to ignore this error.`,
    );
    this.name = "EquipmentNotInstalledError";
    this.command = details.command;
    this.requirement = details.requirement;
    this.poolId = details.poolId;
    this.hint = details.hint;
    this.inventory = details.inventory;
  }
}
