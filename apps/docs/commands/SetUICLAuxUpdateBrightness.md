---
opcode: 216
area: system
status: unverified
summary:
  "Sends an Aux button's stored brightness to its networked ColorLogic lights, a
  network-module feature Omni controllers do not offer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICLAuxUpdateBrightness

<CommandFacts />

Sends an Aux button's stored brightness to its networked ColorLogic lights, a
network-module feature Omni controllers do not offer.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUICLAuxUpdateBrightness", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUICLAuxUpdateBrightness</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
