---
opcode: 201
area: system
status: unverified
summary:
  "Makes a found networked ColorLogic light blink so it can be told apart by its
  serial number. Omni controllers do not offer this network-module feature."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetCLSerialIdentifyStart

<CommandFacts />

Makes a found networked ColorLogic light blink so it can be told apart by its
serial number. Omni controllers do not offer this network-module feature.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetCLSerialIdentifyStart", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetCLSerialIdentifyStart</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
