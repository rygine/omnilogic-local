---
opcode: 333
area: panel
status: verified
summary:
  "Reads the name of the system, a body of water, or a piece of equipment."
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# UiGetConfigObjectName

<CommandFacts />

Reads the name of the system, a body of water, or a piece of equipment.

## Parameters

| name          | type | notes |
| ------------- | ---- | ----- |
| `equipmentId` | int  |       |

## Reply

<Pill label="Opcode" value="1333" />

`UiGetConfigObjectNameRsp`

| name       | type   | unit |
| ---------- | ------ | ---- |
| `systemId` | int    |      |
| `name`     | string |      |

## Example

```typescript
const reply = await omni.command("UiGetConfigObjectName", {
  equipmentId: 3,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>UiGetConfigObjectName</Name>
  <Parameters>
    <Parameter name="equipmentId" dataType="int">3</Parameter>
  </Parameters>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>UiGetConfigObjectNameRsp</Name>
  <Parameters>
    <Parameter name="SystemId" dataType="int">3</Parameter>
    <Parameter name="name" dataType="string">Filter Pump</Parameter>
  </Parameters>
</Response>
```
