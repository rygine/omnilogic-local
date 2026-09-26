# omnilogic-local

A TypeScript SDK, a command line, a Homebridge plugin, and an example web app
for local control of Hayward OmniLogic pool controllers, with the documentation
for all of them. No internet or cloud login required.

- [`packages/omnilogic-local-sdk`](packages/omnilogic-local-sdk) — the SDK. See
  its [README](packages/omnilogic-local-sdk/README.md) for installation and
  usage.
- [`packages/omnilogic-local-cli`](packages/omnilogic-local-cli) — the command
  line: the configuration, telemetry, and any command from a shell. See its
  [README](packages/omnilogic-local-cli/README.md).
- [`packages/homebridge-omnilogic-local`](packages/homebridge-omnilogic-local) —
  the Homebridge plugin: the equipment in HomeKit. See its
  [README](packages/homebridge-omnilogic-local/README.md).
- [`apps/web`](apps/web) — the example web app: a browser interface to the
  verified commands, for one controller. Runs on the host or in Docker.
- [`apps/docs`](apps/docs) — the documentation site: the SDK guide, the command
  reference, and how to run the web app.

## Development

Node.js 24 or later and Yarn 4 (installed by Corepack from `packageManager`).

```bash
git clone https://github.com/rygine/omnilogic-local.git
cd omnilogic-local
yarn install
yarn ci        # lint, format check, build, test, and typecheck, as CI runs them
yarn start     # build the SDK and run the web app in dev mode
```

`yarn build`, `yarn test`, and `yarn typecheck` run in every package through
Turborepo; `yarn lint`, `yarn fix`, `yarn format`, and `yarn format:check` apply
to the whole repository. `yarn dev` inside `apps/docs` serves the documentation
site.

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.
