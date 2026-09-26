---
opcode: 326
area: favorites
status: verified
summary: Removes a favorite by its favorite id.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# DeleteUIFavoriteCmd

<CommandFacts />

Removes a favorite by its favorite id.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("DeleteUIFavoriteCmd", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>DeleteUIFavoriteCmd</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
