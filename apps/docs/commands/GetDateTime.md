---
opcode: 102
area: system
status: verified
summary: Reads the controller's date and time.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetDateTime

<CommandFacts />

Reads the controller's date and time.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1102" />

`GetDateTimeRsp`

| name     | type   | unit |
| -------- | ------ | ---- |
| `year`   | int    |      |
| `month`  | int    |      |
| `day`    | int    |      |
| `format` | bool   |      |
| `hour`   | int    |      |
| `minute` | int    |      |
| `amPm`   | string |      |

## Example

```typescript
const reply = await omni.command("GetDateTime");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetDateTime</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetDateTimeRsp</Name>
  <Parameters>
    <Parameter name="Year" dataType="int">2026</Parameter>
    <Parameter name="Month" dataType="int">8</Parameter>
    <Parameter name="Day" dataType="int">25</Parameter>
    <Parameter name="Format" dataType="bool">0</Parameter>
    <Parameter name="Hour" dataType="int">2</Parameter>
    <Parameter name="Minute" dataType="int">20</Parameter>
    <Parameter name="AM_PM" dataType="string">PM</Parameter>
  </Parameters>
</Response>
```
