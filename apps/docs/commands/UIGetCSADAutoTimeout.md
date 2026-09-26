---
opcode: 248
area: csad
status: unverified
summary: "Reads a Sense and Dispense module's pH dispensing timeout in minutes."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UIGetCSADAutoTimeout

<CommandFacts />

Reads a Sense and Dispense module's pH dispensing timeout in minutes.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `poolId`      | int  |       |
| `equipmentId` | int  |       |

## Reply

Not known. `command()` returns nothing.

## Example

```typescript
await omni.command("UIGetCSADAutoTimeout", {
  poolId: 1,
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UIGetCSADAutoTimeout</Name>
  <Parameters>
    <Parameter name="poolId" dataType="int">1</Parameter>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

No example reply is available.
