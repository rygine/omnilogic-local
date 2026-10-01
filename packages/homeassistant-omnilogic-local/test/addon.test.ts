import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..");

describe("add-on", () => {
  it("carries the package version and names the same options in config and translations", () => {
    const { version } = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    ) as { version: string };
    const config = readFileSync(join(dir, "addon/config.yaml"), "utf8");
    const translations = readFileSync(
      join(dir, "addon/translations/en.yaml"),
      "utf8",
    );

    expect(config).toContain(`version: "${version}"`);

    const options = [
      "host",
      "poll_interval",
      "diagnostics_interval",
      "log_level",
      "mqtt_url",
      "disable_imported_schedules",
      "speed_unit",
    ];
    expect(options.filter((o) => !config.includes(`${o}:`))).toEqual([]);
    expect(options.filter((o) => !translations.includes(`${o}:`))).toEqual([]);
  });
});
