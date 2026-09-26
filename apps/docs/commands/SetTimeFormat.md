---
opcode: 115
area: panel
status: verified
summary: Sets whether the panel shows 12- or 24-hour time.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetTimeFormat

<CommandFacts />

Sets whether the panel shows 12- or 24-hour time.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetTimeFormat", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetTimeFormat</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
