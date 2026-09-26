---
opcode: 117
area: panel
status: verified
summary: >-
  Sets the panel's units flag. The configuration's own units setting does not
  change to match it.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUnits

<CommandFacts />

Sets the panel's units flag. The configuration's own units setting does not
change to match it.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUnits", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUnits</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
