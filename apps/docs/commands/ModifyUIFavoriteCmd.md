---
opcode: 327
area: favorites
status: unusable
summary: >-
  Tries to change a favorite's value, but the controller acknowledges it and
  changes nothing.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# ModifyUIFavoriteCmd

<CommandFacts />

Tries to change a favorite's value, but the controller acknowledges it and
changes nothing.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("ModifyUIFavoriteCmd", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>ModifyUIFavoriteCmd</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
