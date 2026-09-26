---
opcode: 226
area: equipment
status: unverified
summary: What this command does is not known.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetLightModeByRelay

<CommandFacts />

What this command does is not known.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |
| `field1c`     | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetLightModeByRelay", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field1c: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetLightModeByRelay</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
