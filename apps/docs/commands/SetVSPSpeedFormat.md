---
opcode: 119
area: panel
status: verified
summary: Sets whether the panel shows pump speeds as RPM or percent.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetVSPSpeedFormat

<CommandFacts />

Sets whether the panel shows pump speeds as RPM or percent.

## Parameters

| name   | type | notes |
| ------ | ---- | ----- |
| `data` | int  |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetVSPSpeedFormat", {
  data: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetVSPSpeedFormat</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
