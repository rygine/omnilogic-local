import { databaseUrl, ensureDataDir } from "./database";

it("derives a file: url and ensures the dir", () => {
  expect(databaseUrl.startsWith("file:")).toBe(true);
  expect(() => ensureDataDir()).not.toThrow();
});
