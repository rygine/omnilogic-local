---
opcode: 222
area: system
status: unverified
summary:
  "Toggles every networked ColorLogic light between full white and off, a
  network-module feature Omni controllers do not offer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUICLAllOnWhite

<CommandFacts />

Toggles every networked ColorLogic light between full white and off, a
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
await omni.command("SetUICLAllOnWhite", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUICLAllOnWhite</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
