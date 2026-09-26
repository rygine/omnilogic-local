---
opcode: 104
area: system
status: verified
summary: Reads the controller's date.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetDate

<CommandFacts />

Reads the controller's date.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1104" />

`GetDateRsp`

| name    | type | unit |
| ------- | ---- | ---- |
| `year`  | int  |      |
| `month` | int  |      |
| `day`   | int  |      |

## Example

```typescript
const reply = await omni.command("GetDate");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetDate</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetDateRsp</Name>
  <Parameters>
    <Parameter name="Year" dataType="int">2026</Parameter>
    <Parameter name="Month" dataType="int">8</Parameter>
    <Parameter name="Day" dataType="int">25</Parameter>
  </Parameters>
</Response>
```
