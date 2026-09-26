---
opcode: 325
area: favorites
status: verified
summary: >-
  Creates a favorite: a saved equipment-and-value pair shown as a quick-access
  button.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# CreateUIFavoriteCmd

<CommandFacts />

Creates a favorite: a saved equipment-and-value pair shown as a quick-access
button.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |
| `data`        | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("CreateUIFavoriteCmd", {
  equipmentId: 1,
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>CreateUIFavoriteCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
