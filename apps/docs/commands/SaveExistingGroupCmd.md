---
opcode: 319
area: themes
status: verified
summary: Saves a stored theme unchanged.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SaveExistingGroupCmd

<CommandFacts />

Saves a stored theme unchanged.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SaveExistingGroupCmd", {
  equipmentId: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SaveExistingGroupCmd</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
