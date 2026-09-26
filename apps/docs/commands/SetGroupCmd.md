---
opcode: 321
area: themes
status: verified
summary:
  Renames a theme. The controller refuses the rename when another theme already
  has the name.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetGroupCmd

<CommandFacts />

Renames a theme. The controller refuses the rename when another theme already
has the name.

## Parameters

| name          | type   | notes          |
| ------------- | ------ | -------------- |
| `equipmentId` | int    |                |
| `name`        | string | up to 12 bytes |
| `daysActive`  | byte   |                |
| `recurring`   | byte   |                |
| `poolId`      | int    |                |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetGroupCmd", {
  equipmentId: 1,
  name: "",
  daysActive: 0,
  recurring: 0,
  poolId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetGroupCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="name" dataType="string"/>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
