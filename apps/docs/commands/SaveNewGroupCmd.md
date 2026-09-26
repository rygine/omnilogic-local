---
opcode: 318
area: themes
status: verified
summary: Creates a theme from the current state of every piece of equipment.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SaveNewGroupCmd

<CommandFacts />

Creates a theme from the current state of every piece of equipment.

## Parameters

| name         | type   | notes          |
| ------------ | ------ | -------------- |
| `name`       | string | up to 12 bytes |
| `daysActive` | byte   |                |
| `recurring`  | byte   |                |
| `poolId`     | int    |                |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SaveNewGroupCmd", {
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
  <Name>SaveNewGroupCmd</Name>
  <Parameters>
    <Parameter name="name" dataType="string"/>
    <Parameter name="daysActive" dataType="byte">0</Parameter>
    <Parameter name="recurring" dataType="byte">0</Parameter>
    <Parameter name="poolId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
