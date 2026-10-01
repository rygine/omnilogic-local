import { readFileSync } from "node:fs";
import { join } from "node:path";

// the reference config with the pool light switched into OmniDirect mode
export const omniDirectConfigXml = (): string =>
  configXml().replace(
    "<Networked>no</Networked>",
    "<Networked>no</Networked><V2-Active>yes</V2-Active>",
  );

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "../../../fixtures", name), "utf8");

// the extra config, with relays on the backyard itself
export const extraConfigXml = (): string => fixture("config-extra.xml");

// the reference config plus one theme
export const configXml = (): string =>
  fixture("config.xml").replace(
    "</MSPConfig>",
    "<Groups><group><System-Id>29</System-Id><Name>Party</Name><Icon-Id>0</Icon-Id></group></Groups></MSPConfig>",
  );
