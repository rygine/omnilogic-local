# Editing a page

Every page ends with a **Suggest changes to this page** link. It opens the
page's markdown file on GitHub, where your edit becomes a pull request.

## Editing a command page

The [status tables](/commands/status) read the frontmatter at the top of a
command page:

```yaml
---
opcode: 25
area: equipment
status: verified
summary: "Reads the current water temperature for one body of water."
firmware: [R0502000]
models: [OmniLogic MSP]
---
```

- `status` is one of `verified`, `unverified`, or `unusable`. The
  [Status](/commands/status) page defines them.
- `firmware` and `models` list every firmware version and controller model the
  command was run on. Add yours. Do not remove the others.
- `area` places the page in the sidebar: `equipment`, `heater`, `chlorinator`,
  `csad` (Chemistry Sense and Dispense), `schedules`, `favorites`, `themes`,
  `panel`, `system`, or `diagnostics`.

The build checks every page's frontmatter, so a typo fails the pull request's
checks and names the page.
