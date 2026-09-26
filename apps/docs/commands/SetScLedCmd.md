---
opcode: 168
area: system
status: unverified
summary: What this command does is not known.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetScLedCmd

<CommandFacts />

What this command does is not known.

## Parameters

| name      | type | notes |
| --------- | ---- | ----- |
| `data`    | int  |       |
| `field1c` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetScLedCmd", {
  data: 0,
  field1c: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetScLedCmd</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
