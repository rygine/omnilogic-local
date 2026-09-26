---
opcode: 263
area: csad
status: unverified
summary:
  "Enables or disables pH Extend, which keeps the filter pump running past its
  schedule until the pH reaches the set point."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADExtendEnabled

<CommandFacts />

Enables or disables pH Extend, which keeps the filter pump running past its
schedule until the pH reaches the set point.

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
await omni.command("UISetCSADExtendEnabled", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADExtendEnabled</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
