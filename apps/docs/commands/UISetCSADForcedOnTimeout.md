---
opcode: 247
area: csad
status: unverified
summary:
  "Sets how long forced-on mode dispenses pH reducer regardless of the reading
  before it returns to auto sensing. The panel uses 15 minutes."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UISetCSADForcedOnTimeout

<CommandFacts />

Sets how long forced-on mode dispenses pH reducer regardless of the reading
before it returns to auto sensing. The panel uses 15 minutes.

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
await omni.command("UISetCSADForcedOnTimeout", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UISetCSADForcedOnTimeout</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
