---
name: sdk-docs
description:
  Use when writing or editing any page under apps/docs, adding a guide page,
  editing a command page, or reviewing the documentation site for a reader who
  is using the SDK
---

# SDK docs

The site is for a person using `@rygine/omnilogic-local-sdk` in their own
program. They have a controller, the package installed, and a thing they want to
do. Every page is shaped for that reader and no other.

## The three page kinds

### A guide page is one thing the reader does

In this order, nothing else:

1. `# <the thing>` and one sentence saying what it is.
2. A working code block that does it, with `omni` already constructed. The
   reader can paste it.
3. The options and variations, each as a short code block or a bullet, in the
   order the reader meets them.
4. What goes wrong and what it looks like, if anything does.

A heading that names an action starts with a gerund: "Installing", "Reading",
"Sending a command". A heading that names a thing stays a noun: an SDK name, a
piece of equipment, a list such as "Options", or a symptom.

A guide page names SDK methods, types, and options. It never names a source
file, a test, a fixture, a script, a firmware address, a handler, a date, a
person, or how a fact was established.

### A command page is a signature

In this order:

1. Frontmatter: `opcode`, `area`, `status`, `summary`, `firmware`, `models`.
2. `# <Name>` and the summary as one sentence: what the command does to the
   controller.
3. One line of flags: opcode, status, read-only, what equipment it needs.
4. A caveat callout when the spec carries one.
5. `## Parameters` (name, type, notes), `## Reply` (name, opcode, fields, or
   "acknowledged only"), `## Example` (one `command()` call), `## Request XML`,
   and `## Response XML`, the last two as captured.

The commands are known and fixed. A page changes when a reader runs the command
and reports what it did: the status, the firmware and model lists, the summary
if the command does something other than it says, and the captures.

The summary is the only prose. It says what the controller does, in words a user
of the controller uses: "Sets the pool heater's set point." Not which handler,
which offset, which other opcode shares code, or what a probe saw. When nothing
establishes what a command does, the summary is "What this command does is not
known." The name is never evidence: nothing is inferred from it. Hayward's
manuals are: a feature they describe, with one command family that fits it, is a
summary.

### The reference is generated

TypeDoc writes it from the source. Nothing is written by hand there.

## Words that do not appear on the site

Handler, decompile, offset, ledger, probe, capture (outside the XML sections),
the reference pool, the owner, consent, verified live, any `0x` address, any
`FUN_` name, any date, any `.ts` path, any test or script name.

The status flag is the one place a page says whether a command has been run on
hardware. Prose never restates it.

## Every example compiles

`tests/examples.test.ts` type-checks every `typescript` block on every guide and
command page against the SDK, with `omni`, `config`, and `telemetry`
predeclared. A block that names a method that does not exist fails the build.
Write examples by reading the SDK's source for the real names, then let the test
confirm them.

Keep every line in a code block to 75 characters or fewer. A longer line gives
the block a horizontal scrollbar. A comment says one short thing on one line.

## Checklist for a page

- The first code block does the thing the title names.
- Every method, option, and field in it exists in the SDK.
- No word from the banned list.
- One topic. A second subject is a second page.
- `yarn workspace @rygine/omnilogic-docs test` and `build` pass.
