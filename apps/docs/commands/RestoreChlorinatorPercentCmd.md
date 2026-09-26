---
opcode: 291
area: chlorinator
status: verified
summary: >-
  Clears the chlorinator's temporary percent override and restores the
  configured percent.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# RestoreChlorinatorPercentCmd

<CommandFacts />

Clears the chlorinator's temporary percent override and restores the configured
percent.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("RestoreChlorinatorPercentCmd", {
  poolId: 1,
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>RestoreChlorinatorPercentCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
