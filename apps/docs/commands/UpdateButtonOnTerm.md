---
opcode: 328
area: system
status: unverified
summary:
  "Assigns a spa-side remote's Aux button to a piece of equipment, a favorite,
  or a theme, or clears it."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UpdateButtonOnTerm

<CommandFacts />

Assigns a spa-side remote's Aux button to a piece of equipment, a favorite, or a
theme, or clears it.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |
| `data`        | int  |       |
| `field1c`     | int  |       |
| `field20`     | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UpdateButtonOnTerm", {
  equipmentId: 1,
  data: 0,
  field1c: 0,
  field20: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UpdateButtonOnTerm</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
    <Parameter name="field20" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
