---
opcode: 220
area: equipment
status: unverified
summary:
  "Reads the serial numbers of the networked ColorLogic lights the search found,
  a network-module feature Omni controllers do not offer."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUICLAllFindLightsReport

<CommandFacts />

Reads the serial numbers of the networked ColorLogic lights the search found, a
network-module feature Omni controllers do not offer.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUICLAllFindLightsReport", {
  poolId: 1,
  equipmentId: 8,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUICLAllFindLightsReport</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">8</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
