---
opcode: 107
area: panel
status: verified
summary: Turns the panel's backlight on or off.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetBackLight

<CommandFacts />

Turns the panel's backlight on or off.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetBackLight", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetBackLight</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
