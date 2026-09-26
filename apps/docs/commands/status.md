# Status

Every command page says whether the command was run on real hardware. The tables
here are built from those pages. When you edit a page's frontmatter, the tables
change.

<table>
  <tr>
    <td><StatusPill status="verified" /></td>
    <td>You sent it to a controller, and verified the effect in the configuration, the telemetry, or on the equipment.</td>
  </tr>
  <tr>
    <td><StatusPill status="unverified" /></td>
    <td>Never sent.</td>
  </tr>
  <tr>
    <td><StatusPill status="unusable" /></td>
    <td>The controller acknowledges it and does nothing, or the SDK never sends it.</td>
  </tr>
</table>

A verified command can still carry a caveat: something it does that a caller
would not expect. The SDK logs the caveat at `warn` and sends the command
anyway. The command's page states the caveat.

## Verified

<CommandTable status="verified" />

## Unverified

<CommandTable status="unverified" />

## Unusable

<CommandTable status="unusable" />
