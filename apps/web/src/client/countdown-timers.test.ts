import {
  clearCountdownTimers,
  scheduleCountdownTimers,
} from "./countdown-timers";

const key = ["countdown", "h", 1, 2, 3];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("runs each step at its time", () => {
  const ran: number[] = [];
  scheduleCountdownTimers(key, [
    { at: 100, run: () => ran.push(1) },
    { at: 300, run: () => ran.push(2) },
  ]);
  vi.advanceTimersByTime(150);
  expect(ran).toEqual([1]);
  vi.advanceTimersByTime(200);
  expect(ran).toEqual([1, 2]);
});

it("drops every pending step on cancel", () => {
  const ran: number[] = [];
  scheduleCountdownTimers(key, [{ at: 100, run: () => ran.push(1) }]);
  clearCountdownTimers(key);
  vi.advanceTimersByTime(1000);
  expect(ran).toEqual([]);
});

it("replaces the previous run's steps on a restart of the same equipment", () => {
  const ran: string[] = [];
  scheduleCountdownTimers(key, [{ at: 100, run: () => ran.push("first") }]);
  scheduleCountdownTimers(key, [{ at: 100, run: () => ran.push("second") }]);
  vi.advanceTimersByTime(1000);
  expect(ran).toEqual(["second"]);
});
