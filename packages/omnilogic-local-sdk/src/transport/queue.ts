import type { OmniLogicMessage } from "@/transport/message";
import { OmniTimeoutError } from "@/utils/errors";
import { createLogger } from "@/utils/logger";

const protocolLog = createLogger("protocol");

type PendingResolver = {
  resolve: (value: OmniLogicMessage) => void;
  reject: (reason: Error) => void;
};

export class MessageQueue {
  #pendingResolvers: PendingResolver[] = [];
  #queue: OmniLogicMessage[] = [];
  // the error that ended the socket
  #failure: Error | undefined;

  add(message: OmniLogicMessage) {
    const next = this.#pendingResolvers.shift();
    if (next) {
      next.resolve(message);
    } else {
      this.#queue.push(message);
    }
  }

  next(timeoutMs: number, timeoutMessage: string): Promise<OmniLogicMessage> {
    if (this.#failure !== undefined) {
      return Promise.reject(this.#failure);
    }
    const message = this.#queue.shift();
    if (message !== undefined) {
      return Promise.resolve(message);
    }
    return new Promise((resolve, reject) => {
      const pending: PendingResolver = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timer);
          reject(reason);
        },
      };
      const timer = setTimeout(() => {
        this.#pendingResolvers = this.#pendingResolvers.filter(
          (p) => p !== pending,
        );
        reject(new OmniTimeoutError(timeoutMessage));
      }, timeoutMs);
      this.#pendingResolvers.push(pending);
    });
  }

  reset(failure?: Error) {
    this.#failure = failure ?? this.#failure;
    if (this.#pendingResolvers.length > 0 || this.#queue.length > 0) {
      protocolLog.trace("queue reset", {
        waiters: this.#pendingResolvers.length,
        buffered: this.#queue.length,
      });
    }
    for (const pending of this.#pendingResolvers) {
      pending.reject(
        failure ?? new OmniTimeoutError("The operation was closed"),
      );
    }
    this.#pendingResolvers = [];
    this.#queue = [];
  }
}
