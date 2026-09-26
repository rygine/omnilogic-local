---
opcode: 332
area: panel
status: verified
summary: "Renames the system, a body of water, or a piece of equipment."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UiEditConfigObjectName

<CommandFacts />

Renames the system, a body of water, or a piece of equipment.

## Parameters

| name          | type   | notes          |
| ------------- | ------ | -------------- |
| `equipmentId` | int    |                |
| `name`        | string | up to 13 bytes |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("UiEditConfigObjectName", {
  equipmentId: 1,
  name: "",
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UiEditConfigObjectName</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">1</Parameter>
    <Parameter name="name" dataType="string"/>
  </Parameters>
</Request>
```

## Response XML

None.
