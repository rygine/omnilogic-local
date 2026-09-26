import type { Exposable } from "@/discovery";

// a homebridge global with the calls the page makes
export const installHomebridge = (
  found: Exposable[],
  config?: Record<string, unknown>,
) => {
  const saved: unknown[] = [];
  const fake = {
    // a fresh install has no block
    getPluginConfig: () => Promise.resolve(config ? [config] : []),
    updatePluginConfig: (c: unknown[]) => {
      saved.push(c[0]);
      return Promise.resolve();
    },
    request: (path: string) =>
      path === "/discover"
        ? Promise.resolve(found)
        : Promise.reject(new Error(path)),
    showSpinner: () => {},
    hideSpinner: () => {},
    hideSchemaForm: () => {},
    addEventListener: () => {},
  };
  (window as unknown as { homebridge: typeof fake }).homebridge = fake;
  return { saved };
};
