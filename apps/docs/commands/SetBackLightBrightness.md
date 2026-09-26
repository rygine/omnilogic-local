---
opcode: 109
area: panel
status: verified
summary: "Sets the panel backlight's brightness, panel-wide."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetBackLightBrightness

<CommandFacts />

Sets the panel backlight's brightness, panel-wide.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetBackLightBrightness", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetBackLightBrightness</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
