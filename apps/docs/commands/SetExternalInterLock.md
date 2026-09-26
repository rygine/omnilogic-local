---
opcode: 145
area: system
status: unverified
summary:
  "Defines an external-input interlock: a switch or sensor state that forces a
  piece of equipment on or off."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetExternalInterLock

<CommandFacts />

Defines an external-input interlock: a switch or sensor state that forces a
piece of equipment on or off.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |
| `data`        | int  |       |
| `field1c`     | byte |       |
| `field1d`     | byte |       |
| `field1e`     | byte |       |
| `field1f`     | byte |       |
| `field20`     | int  |       |
| `field24`     | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetExternalInterLock", {
  poolId: 1,
  equipmentId: 1,
  data: 0,
  field1c: 0,
  field1d: 0,
  field1e: 0,
  field1f: 0,
  field20: 0,
  field24: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetExternalInterLock</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="byte">0</Parameter>
    <Parameter name="field1d" dataType="byte">0</Parameter>
    <Parameter name="field1e" dataType="byte">0</Parameter>
    <Parameter name="field1f" dataType="byte">0</Parameter>
    <Parameter name="field20" dataType="int">0</Parameter>
    <Parameter name="field24" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
