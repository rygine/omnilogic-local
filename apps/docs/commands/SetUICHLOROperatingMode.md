---
opcode: 279
area: chlorinator
status: unverified
summary:
  "Sets whether the chlorinator runs on a timed percentage or on the ORP reading
  from a Sense and Dispense module."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICHLOROperatingMode

<CommandFacts />

Sets whether the chlorinator runs on a timed percentage or on the ORP reading
from a Sense and Dispense module.

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
await omni.command("SetUICHLOROperatingMode", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUICHLOROperatingMode</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
