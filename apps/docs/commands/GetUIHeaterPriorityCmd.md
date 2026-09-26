---
opcode: 14
area: heater
status: unverified
summary: Reads a heat source's rank among the body's appliances.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetUIHeaterPriorityCmd

<CommandFacts />

Reads a heat source's rank among the body's appliances.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetUIHeaterPriorityCmd", {
  poolId: 1,
  equipmentId: 4,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetUIHeaterPriorityCmd</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">4</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
