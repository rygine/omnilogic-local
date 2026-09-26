---
opcode: 103
area: system
status: verified
summary: "Sets the controller's date and leaves the time of day untouched."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetDate

<CommandFacts />

Sets the controller's date and leaves the time of day untouched.

## Parameters

| name    | type | notes |
| ------- | ---- | ----- |
| `year`  | int  |       |
| `month` | byte |       |
| `day`   | byte |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetDate", {
  year: 0,
  month: 0,
  day: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetDate</Name>
  <Parameters>
    <Parameter name="year" dataType="int">0</Parameter>
    <Parameter name="month" dataType="byte">0</Parameter>
    <Parameter name="day" dataType="byte">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
