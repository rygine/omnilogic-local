---
opcode: 106
area: system
status: verified
summary: Reads the controller's time of day.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetTime

<CommandFacts />

Reads the controller's time of day.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1106" />

`GetTimeRsp`

| name     | type   | unit |
| -------- | ------ | ---- |
| `format` | bool   |      |
| `hour`   | int    |      |
| `minute` | int    |      |
| `amPm`   | string |      |

## Example

```typescript
const reply = await omni.command("GetTime");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetTime</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetTimeRsp</Name>
  <Parameters>
    <Parameter name="Format" dataType="bool">0</Parameter>
    <Parameter name="Hour" dataType="int">2</Parameter>
    <Parameter name="Minute" dataType="int">25</Parameter>
    <Parameter name="AM_PM" dataType="string">PM</Parameter>
  </Parameters>
</Response>
```
