import {
  COMMANDS,
  type CommandName,
  type CommandRequestParam,
  type CommandResponseSpec,
} from "@/client/spec";
import { SCHEDULE_EVERY_DAY } from "@/equipment/schedules";
import { OmniValidationError } from "@/utils/errors";
import {
  buildMessageXml,
  coerceParameterValue,
  parseXML,
  type ResponseMessage,
} from "@/utils/xml";

const validateParam = (
  command: CommandName,
  param: CommandRequestParam,
  index: number,
  value: number | string | undefined,
) => {
  if (param.type === "string") {
    if (typeof value !== "string") {
      throw new OmniValidationError(
        `${command}: missing or non-string parameter "${param.name}" (position ${index})`,
      );
    }
    if (param.values && !param.values.includes(value)) {
      throw new OmniValidationError(
        `${command}: parameter "${param.name}" must be one of ` +
          `${param.values.map((v) => JSON.stringify(v)).join(", ")}, got ` +
          JSON.stringify(value),
      );
    }
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes > param.maxLength) {
      throw new OmniValidationError(
        `${command}: parameter "${param.name}" is ${bytes} bytes, ` +
          `longer than the ${param.maxLength} the controller keeps`,
      );
    }
    return value;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OmniValidationError(
      `${command}: missing or non-numeric parameter "${param.name}" (position ${index})`,
    );
  }
  if (param.type !== "float") {
    if (!Number.isInteger(value)) {
      throw new OmniValidationError(
        `${command}: parameter "${param.name}" must be an integer, got ${value}`,
      );
    }
    // a byte is unsigned, an int a signed 32-bit
    const [min, max] =
      param.type === "byte" ? [0, 255] : [-2147483648, 2147483647];
    if (value < min || value > max) {
      throw new OmniValidationError(
        `${command}: parameter "${param.name}" must be between ${min} and ${max}, got ${value}`,
      );
    }
  }
  return value;
};

export const buildCommandXml = (
  name: CommandName,
  params: Record<string, number | string>,
) => {
  const request = COMMANDS[name].request;
  const known = new Set(request.map((p) => p.name));
  const xml = buildMessageXml(
    name,
    request.map((p, index) => ({
      name: p.name,
      dataType: p.type,
      value: String(validateParam(name, p, index, params[p.name])),
    })),
  );
  return {
    xml,
    unknown: Object.keys(params).filter((k) => !known.has(k)),
  };
};

// matched in order, not by name
export const parseCommandResponse = (
  responseSpec: CommandResponseSpec,
  xml: string,
) => {
  const parsed: ResponseMessage = parseXML(xml);
  const parameters = parsed.response?.parameters?.parameter ?? [];
  if (parameters.length !== responseSpec.parameters.length) {
    return {
      ok: false,
      actual: parameters.length,
      expected: responseSpec.parameters.length,
    };
  }

  const out: Record<string, number | boolean | string> = {};
  responseSpec.parameters.forEach((p, index) => {
    out[p.name] = coerceParameterValue(p.dataType, parameters[index]?._ ?? "");
  });
  return { ok: true, params: out };
};

export type TimerOptions = {
  isCountdownTimer?: boolean;
  startTimeHours?: number;
  startTimeMinutes?: number;
  endTimeHours?: number;
  endTimeMinutes?: number;
  daysActive?: number;
  recurring?: boolean;
};

export const timerParams = (t: TimerOptions = {}) => ({
  // spelled the firmware's way
  isCountDownTimer: Number(t.isCountdownTimer ?? false),
  startTimeHours: t.startTimeHours ?? 0,
  startTimeMinutes: t.startTimeMinutes ?? 0,
  endTimeHours: t.endTimeHours ?? 0,
  endTimeMinutes: t.endTimeMinutes ?? 0,
  daysActive: t.daysActive ?? 0,
  recurring: Number(t.recurring ?? false),
});

export const countdownParams = (minutes: number) =>
  timerParams({
    isCountdownTimer: true,
    endTimeHours: Math.floor(minutes / 60),
    endTimeMinutes: minutes % 60,
    daysActive: SCHEDULE_EVERY_DAY,
  });
