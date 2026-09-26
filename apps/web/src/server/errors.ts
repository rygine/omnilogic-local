import { messageOf } from "@/shared/log";

// BUSY is equipment between states, such as a priming pump or a warming light
type ErrorCode = "BUSY" | "ERROR";

export class WebAppError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "WebAppError";
    this.code = code;
  }
  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

export const toWebAppError = (err: unknown): WebAppError =>
  err instanceof WebAppError ? err : new WebAppError("ERROR", messageOf(err));
