---
opcode: 259
area: csad
status: unverified
summary: "Enables or disables pH dispensing on a Sense and Dispense module."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADEnabled

<CommandFacts />

Enables or disables pH dispensing on a Sense and Dispense module.

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
await omni.command("UISetCSADEnabled", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADEnabled</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
