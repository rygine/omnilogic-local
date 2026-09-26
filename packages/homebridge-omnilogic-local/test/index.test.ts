import plugin from "../src/index";

it("registers the OmniLogicLocal platform", () => {
  const registered: string[] = [];
  const api = {
    registerPlatform: (name: string) => registered.push(name),
  };
  plugin(api as never);
  expect(registered).toEqual(["OmniLogicLocal"]);
});
