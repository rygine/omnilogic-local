---
opcode: 268
area: system
status: unverified
summary:
  "Turns the system off or on, or puts the controller into or out of service
  mode, indefinitely or for a set time."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetUISystemStateCmd

<CommandFacts />

Turns the system off or on, or puts the controller into or out of service mode,
indefinitely or for a set time. The network switch intercepts it. The command
still runs, but the controller does not reply to it as it would to a normal
command.

## Parameters

| name               | type | notes                                                                |
| ------------------ | ---- | -------------------------------------------------------------------- |
| `data`             | int  | 0 off, 1 on, 2 service, 3 config, 4 timed service                    |
| `field1c`          | int  | timed service mode length in minutes. The panel offers 1 to 96 hours |
| `isCountDownTimer` | int  |                                                                      |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetUISystemStateCmd", {
  data: 0,
  field1c: 0,
  isCountDownTimer: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetUISystemStateCmd</Name>
  <Parameters>
    <Parameter name="data" dataType="int">0</Parameter>
    <Parameter name="field1c" dataType="int">0</Parameter>
    <Parameter name="isCountDownTimer" dataType="int">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
