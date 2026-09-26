---
opcode: 120
area: panel
status: verified
summary: Reads whether the panel shows pump speeds as RPM or percent.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetVSPSpeedFormat

<CommandFacts />

Reads whether the panel shows pump speeds as RPM or percent.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1120" />

`GetVSPSpeedFormatRsp`

| name     | type | unit |
| -------- | ---- | ---- |
| `format` | bool |      |

## Example

```typescript
const reply = await omni.command("GetVSPSpeedFormat");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetVSPSpeedFormat</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetVSPSpeedFormatRsp</Name>
  <Parameters>
    <Parameter name="Format" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
