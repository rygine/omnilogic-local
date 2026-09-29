# node-omnilogic

TypeScript library for communicating with Hayward OmniLogic pool controllers via
UDP. Mirrors the architecture of
[python-omnilogic-local](https://github.com/cryptk/python-omnilogic-local).

## Commands

```bash
yarn test          # run tests (vitest)
yarn typecheck     # type check (tsc --noEmit)
yarn lint          # lint (oxlint)
yarn fix           # lint with auto-fix
yarn format        # format (oxfmt)
yarn format:check  # check formatting
yarn build         # build (tsdown / rolldown)
```

## Architecture

One layer, six folders under `packages/omnilogic-local-sdk/src/` (plus
`index.ts`, the only root file). Folders import from one another freely.

- `client/` — `spec.ts`, the 237 commands the firmware's dispatch table handles
  (`CommandName`, `CommandParams`, and `CommandResult` derive from it; an entry
  carries `requires`/`target` for the gate, `read` for the cache, `settle` for
  the transport, and a `caveat` for what the command did that a caller would not
  expect), and `omnilogic.ts`, the one `OmniLogic` class: the session, the one
  `command()`, and the three uncached fetches `fetchConfig()`,
  `fetchTelemetry()`, and `fetchSysInfo()`. `SWITCH_OPCODE` holds the three
  opcodes the network switch answers before dispatch; the fetches send them.
- `types/` — `config.ts`, `telemetry.ts`, `sysinfo.ts`, types only.
- `constants/` — the firmware vocabulary: `labels.ts`, `lightShows.ts`,
  `sentinels.ts`.
- `transport/` — UDP, framing, ACK/retry, multi-block reassembly.
- `equipment/` — `omni.backyard.pool.filter`: sugar over `command()`, the
  configuration, and telemetry, one class per file.
- `utils/` — errors, logger, `xml.ts` (including the three parsers and their
  `Raw*` wire shapes), `command.ts` (request XML from the spec, reply parsing,
  timer options), `inventory.ts` (`discover(config)`, the installed-or-not facts
  per body), `decode.ts` (the firmware's own decodes of the diagnostics bytes),
  and `helpers.ts` (the coercions and `findBySystemId`).

`apps/docs` is the documentation site (VitePress) and the only home for
documentation: no markdown lives outside it except package READMEs and this
file. The `sdk-docs` project skill says what each page kind is. Command pages
carry frontmatter (`opcode`, `area`, `status`, `summary`, `firmware`, `models`)
that the status tables and the sidebar read.
`yarn workspace @rygine/omnilogic-docs test` checks every page's frontmatter,
the coverage against `COMMANDS`, each command page's shape and wording, and that
every guide and command page example compiles against the SDK.

`packages/omnilogic-local-cli` is `omnilogic-local`: `cli.ts` parses with
`node:util` and dispatches the five commands, `command.ts` runs a send (checks,
config cache, prompt, send), `utils.ts` reads the spec for all three, `store.ts`
owns `~/.config/omnilogic-local/`. No dependency the SDK does not already need.

## Key Conventions

- **ESM** with `moduleResolution: "bundler"`. `src/index.ts` uses relative
  imports with no `.js` extension; every other source file imports via the `@/`
  alias. Match the surrounding file's style.
- **Vocabularies are `as const` objects, not `enum`s, and only when
  enumerated.** A frozen object exists for a vocabulary something iterates at
  run time; no derived union types. A value only compared against, or a
  vocabulary of two members, is written as its literals at the point of use
  (`"BOW_POOL"`). A table nothing reads does not go in the code. `tsconfig` sets
  `erasableSyntaxOnly`, which bans `enum` and `const enum`.
- **TypeScript-only syntax is banned.** `tsc` only type-checks; the build strips
  annotations. Only what erases to nothing: annotations, `type`/`interface`,
  generics, `import type`, `as const`, `satisfies`. Not `readonly`, `Readonly*`,
  `protected`, `private`, `public`, `abstract`, `override`, `declare`,
  `namespace`, `enum`, constructor parameter properties, or decorators. A hidden
  member is `#private`; anything a subclass uses is plain; a literal-typed field
  is `kind = "filter" as const`.
- **Every control-flow body has braces.** `oxlint.config.ts` enforces
  `curly: all`; `yarn fix` adds them.
- **`types/config.ts` follows the firmware's config writer.** `parseXML` coerces
  element text and attributes alike: integer-looking text becomes `number`,
  lowercase `yes`/`no` becomes `boolean`, everything else (copied strings,
  `%1.1f` floats, capitalized `Yes`/`No`, `on`/`off`) stays `string`. A name a
  user types is never coerced. Every `<sche>` field including
  `enabled`/`recurring` is a number (`1`/`0` on the wire). Telemetry types are
  number-typed, except `CSAD.ph` and `Telemetry.version`, which are
  `number | string`.
- **Every list in the configuration and telemetry is an array, named for the
  reader.** The parsers make every list field an array at parse time (empty when
  the element is missing), under plural names: `relays`, `bodiesOfWater`,
  `operations`; the `<Schedules><sche>`, `<Favorites><favorite>`, and
  `<Groups><group>` wrappers flatten to `schedules`, `favorites`, and `themes`.
  The tag names live only in the parsers' `Raw*` types. The XML layer yields
  every list tag as an array, one child or many, so the parsers only default an
  absent one to `[]`.
- **Gating refuses only on what the configuration rules out.** `command()`
  checks the inventory (`EquipmentNotInstalledError`); a type the SDK does not
  recognize counts as installed; `{ force: true }` skips it. `requires` and
  `target` are declared from live results, never inferred. See
  `apps/docs/guide/inventory.md`.
- **One `command()`.** It runs every step of a send in order (refresh when no
  config or telemetry is cached, gate, encode, send, parse, mark the cache
  dirty, verify) and each step is skipped by an option, never by a second method
  or class.
- **Logging is environment-driven.** `createLogger(namespace)` takes no config;
  one `LOG_LEVEL` applies to every namespace (`protocol`, `command`,
  `omnilogic`, `equipment`), read per record. `trace` logs every wait, attempt,
  block, decision, and timing, so a `LOG_LEVEL=trace` bug report answers "what
  did the SDK do". Calls are structured: `log.debug("message", { key: value })`.
  One logger per namespace at module scope, never an instance field.
- **There is no connection lifecycle.** `OmniLogicProtocol` opens a UDP socket
  per operation and closes it when the operation ends; a shared socket carries a
  failed operation's late acks and the kernel's buffered datagrams into the next
  one. `test/protocol.test.ts` pins this.
- **Operations run one at a time.** One process-wide queue, shared by every
  instance because a user has one controller, starts each operation in arrival
  order once the previous one has ended and `minSendGapMs` (default 500 ms) has
  passed. Tests that assert timing pass `minSendGapMs: 0`.
- **A settling command holds the queue for everyone.** An entry with
  `settle: true` (the three theme writes: the controller goes quiet 12–22 s
  after acknowledging one) returns to its caller once sent, while the queue
  probes with `GetTelemetry` until the controller answers, pauses
  `settleGraceMs`, then starts the next operation.
- **One `Timings` object, overridable per call.** `DEFAULT_TIMINGS` holds
  `ackTimeoutMs`, `nextMessageTimeoutMs`, `minSendGapMs`, and `settleGraceMs`;
  `new OmniLogic({ timings })` overrides for the session,
  `command(name, params, { timings })` for one send. Tests pass short ones.
- **A write is verified through `command()`, and never resent unasked.**
  `command(name, params, { verify, timeoutMs, pollMs, attempts, failure })`
  refreshes after the send and asks `verify` whether the command took, polling
  until `timeoutMs` (default 0: one check), resending up to `attempts` (default
  1), then throwing `CommandFailedError` with `failure`, worded for the
  operation ("Unable to create theme"). The controller acks a command it then
  drops, so only the configuration and telemetry can say. No other code retries
  or refreshes by hand. The light alone waits for a stable state before sending.
- **The equipment layer is hard-coded, one class per file**, a method per value
  established on hardware (`filter.setMinSpeed(60)`, `pool.waterTemp`). A read
  returns the plain value: a `boolean`, a `number`, the label of an enumerated
  state, the firmware's decode of a diagnostics byte, `undefined` for a
  sentinel; no wrapper object. A read of the configuration or telemetry is a
  getter with the wire row on `state`; an async diagnostics read takes
  `{ raw: true }`. No table describing the values, no generic read/write;
  `Device` holds the session and the three ids. `OmniLogic` reaches the layer
  through `backyard` alone. What a device tells you about itself is a getter
  over a `#private` field, never a writable one, since `readonly` is among the
  syntax this repository cannot use.
- **Reads surface freely; writes are what must be verified.** A read has a
  method whenever the controller reports the value, confirmed on hardware or
  not: a wrong number costs a caller nothing that sending the command by hand
  would not. A write moves equipment, so it surfaces once it has been seen to
  work, or with the guide saying plainly that it has not. The evidence is kept
  outside this repository.
- **Units are resolved, never declared.** The controller decides them
  (`config.system.units`, `config.system.mspVspSpeedFormat`, each sensor's
  `units`). Nothing converts. Both are display settings: telemetry reports a
  filter speed as a percent whichever way the speed format is set, and every
  temperature on the wire is °F whichever way the units are set, since the
  firmware normalizes a Celsius sensor to °F on the way in and converts only on
  the panel's screen. The configuration carries RPM bounds in the 2000–3450
  range beside those percents, so a percent range check would be wrong. The one
  exception is a pump's speed to and from RPM (`toRpm`, `fromRpm`): the
  percent's share of the pump's top RPM, to the nearest 10.

## Working on the controller

**Never send a mutating command to a real controller without the user's express
consent, asked for each run.** Reads (`Get*`, `GetTelemetry`,
`RequestConfiguration`) are free. Writes are not. The heater is gas: every
set-point move goes down and enable is tested with the set point at its minimum
so the burner is never called for. The command line in
`packages/omnilogic-local-cli` is the only way the repository reaches hardware;
the `omnilogic-local-cli` project skill says how to use it. Nothing in the
repository mutates the controller on its own.

`apps/docs/commands/status.md` shows what is verified.

## Web app: what may run in the browser

`apps/web/src/client`, `components`, `routes`, and `shared` ship to the browser.
`oxlint.config.ts` refuses, in those folders, any run-time import of the SDK (it
opens UDP sockets through `node:dgram`; Vite stubs the module in the browser
bundle and the page breaks at run time), of a Node built-in, or of a server
module other than the server functions under `@/server/fns` (isomorphic RPC
entry points). Type-only imports are erased and stay allowed. A constant the
browser needs from the SDK is mirrored into `@/shared` with a test that pins the
two together (`shared/spillover.ts` and its test are the pattern). Tests are
exempt; they run under Node.

## Web app: the image

The app ships as a Docker image. Its `Dockerfile`, `Dockerfile.dockerignore`,
`compose.yaml`, and the `dev/build.sh`, `dev/run.sh`, `dev/down.sh` wrappers
live in `apps/web` (every deployable keeps its own) while the build context is
the repository root, so the SDK is built inside the image first. `vite build`
goes through the nitro plugin and emits `apps/web/.output/server/index.mjs`, a
listening server honoring `PORT` and `HOST`; the container runs
`prisma migrate deploy` then that, as uid 1000, with `DATA_DIR=/data` on a
volume. `GET /health` backs the `HEALTHCHECK`; `prisma` is a runtime dependency
for that reason. The Node base image is pinned to the minor version; a bump is
built and run as an image before it lands. See `apps/web/README.md`.

## Gotchas

- Commits are SSH-signed (`gpg.format=ssh`, key `~/.ssh/id_ed25519`); never pass
  `--no-gpg-sign`
- tsdown `fixedExtension: false` ensures `.js`/`.d.ts` output (not
  `.mjs`/`.d.mts`) since package has `"type": "module"`

## Testing

- Vitest with globals enabled — no need to import `describe`, `it`, `expect`
- `makeRecorder()` in `test/mocks.ts` injects a stubbed `OmniLogicProtocol`
  (`as unknown as OmniLogicProtocol`) through the `protocol` option and returns
  `{ omni, sent }`, where `sent` records `{ opcode, xml }` per send;
  `valuesOf(xml)` pulls `<Parameter>` values out in wire order. A test that
  scripts a controller passes `{ onSend, telemetry, config }`: `onSend` sees
  every send by command name with its parameters decoded from the payload the
  real encoder built, and the two fakes replace
  `fetchTelemetry()`/`fetchConfig()` on the instance, so `command()`'s refresh
  and verify loop run against them. Without them the fakes answer an empty
  configuration and telemetry; `{ realFetches: true }` sends the fetches through
  the transport.
- **The plugin's tests read the SDK's `test/fixtures/config.xml` and
  `config-extra.xml`; nothing under its `src` does.**
- **No test talks to a controller.** Anything that reaches real hardware goes
  through the command line (`packages/omnilogic-local-cli`); its `info` says
  whether a command is a read, from the spec's `read` flag.
- **A setting the configuration carries is a getter, not a command.**
  `refresh()` refetches the configuration when the checksum moves, so a setting
  read from it is current; a caller wanting a newer one calls `refresh()`. A
  command read is left only where neither the configuration nor telemetry holds
  the value: the salt cell's electrical readings, the panel's beeper and
  backlight, the drive's firmware revisions, the live countdowns, and the
  heater's auto-differential. Which of the two a value is comes from moving it
  on a controller and seeing whether the configuration follows, never from the
  names matching.
- **A command's `read` flag is what marks the cache.** `spec.ts` declares
  `read: true` on every Get/UIGet that takes nothing but ids; `command()` sets
  `telemetryDirty` after any command without it, so the next default `refresh()`
  refetches. `test/spec.test.ts` pins the flag both ways, so a new read has to
  be flagged and a flag cannot sit on something that acts.
