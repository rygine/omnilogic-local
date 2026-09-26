---
opcode: 378
area: system
status: unverified
summary: "Sets the panel's display mode state, panel-wide."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUIDisplayModeState

<CommandFacts />

Sets the panel's display mode state, panel-wide.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUIDisplayModeState", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUIDisplayModeState</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
