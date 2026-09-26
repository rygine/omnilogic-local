---
opcode: 320
area: themes
status: verified
summary: Removes a theme.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# DeleteGroupCmd

<CommandFacts />

Removes a theme.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("DeleteGroupCmd", {
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>DeleteGroupCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
