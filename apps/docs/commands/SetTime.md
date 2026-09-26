---
opcode: 105
area: system
status: unverified
summary:
  Sets the controller's time of day. Unlike SetTime2, it takes no seconds.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetTime

<CommandFacts />

Sets the controller's time of day. Unlike [SetTime2](/commands/SetTime2), it
takes no seconds.

## Parameters

| name       | type   | notes                       |
| ---------- | ------ | --------------------------- |
| `is24Hour` | byte   |                             |
| `hour`     | byte   |                             |
| `minute`   | byte   |                             |
| `amPm`     | string | up to 9 bytes, `AM` or `PM` |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetTime", {
  is24Hour: 0,
  hour: 0,
  minute: 0,
  amPm: "AM",
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetTime</Name>
  <Parameters>
    <Parameter name="is24Hour" dataType="byte">0</Parameter>
    <Parameter name="hour" dataType="byte">0</Parameter>
    <Parameter name="minute" dataType="byte">0</Parameter>
    <Parameter name="amPm" dataType="string">AM</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
