---
opcode: 146
area: system
status: unverified
summary:
  "Reads one external-input interlock by its index: its source, compare type,
  active level, and the state it forces."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetExternalInterLock

<CommandFacts />

Reads one external-input interlock by its index: its source, compare type,
active level, and the state it forces.

## Parameters

| name          | type | notes                 |
| ------------- | ---- | --------------------- |
| `poolId`      | int  |                       |
| `equipmentId` | int  |                       |
| `data`        | int  | the interlock's index |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("GetExternalInterLock", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetExternalInterLock</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
