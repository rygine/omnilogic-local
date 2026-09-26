---
opcode: 113
area: panel
status: verified
summary: "Turns the panel's touch beeper on or off, panel-wide."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetBeeper

<CommandFacts />

Turns the panel's touch beeper on or off, panel-wide.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetBeeper", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetBeeper</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
