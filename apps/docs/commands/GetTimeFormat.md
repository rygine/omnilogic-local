---
opcode: 116
area: panel
status: verified
summary: Reads whether the panel shows 12- or 24-hour time.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetTimeFormat

<CommandFacts />

Reads whether the panel shows 12- or 24-hour time.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1116" />

`GetTimeFormatRsp`

| name     | type | unit |
| -------- | ---- | ---- |
| `format` | int  |      |

## Example

```typescript
const reply = await omni.command("GetTimeFormat");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetTimeFormat</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetTimeFormatRsp</Name>
  <Parameters>
    <Parameter name="Format" dataType="int">12</Parameter>
  </Parameters>
</Response>
```
