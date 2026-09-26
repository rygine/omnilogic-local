---
opcode: 324
area: favorites
status: unverified
summary: >-
  Creates a favorite: a saved equipment-and-value pair shown as a quick-access
  button.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# CreateUIFavoriteAltCmd

<CommandFacts />

Creates a favorite: a saved equipment-and-value pair shown as a quick-access
button.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |
| `data`        | byte |       |
| `field19`     | byte |       |
| `field1a`     | byte |       |
| `field1b`     | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("CreateUIFavoriteAltCmd", {
  equipmentId: 1,
  data: 0,
  field19: 0,
  field1a: 0,
  field1b: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>CreateUIFavoriteAltCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="byte">0</Parameter>
    <Parameter name="field19" dataType="byte">0</Parameter>
    <Parameter name="field1a" dataType="byte">0</Parameter>
    <Parameter name="field1b" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
