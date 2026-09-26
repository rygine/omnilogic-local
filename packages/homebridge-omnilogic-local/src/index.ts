import type { API } from "homebridge";

import { OmniLogicPlatform, PLATFORM_NAME } from "./platform";

export default (api: API): void => {
  api.registerPlatform(PLATFORM_NAME, OmniLogicPlatform);
};
