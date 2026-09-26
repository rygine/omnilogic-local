---
opcode: 267
area: csad
status: unverified
summary:
  "Sets a Sense and Dispense module's pH mode: disabled, auto sensing, or forced
  on. The controller silently drops it unless equipmentId is the module's own
  id."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADMode

<CommandFacts />

Sets a Sense and Dispense module's pH mode: disabled, auto sensing, or forced
on. The controller silently drops it unless equipmentId is the module's own id.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UISetCSADMode", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADMode</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
