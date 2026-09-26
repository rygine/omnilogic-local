---
opcode: 417
area: panel
status: verified
summary: Reads the controller's latitude and longitude.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCoordinates

<CommandFacts />

Reads the controller's latitude and longitude.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1417" />

`GetCoordinatesRsp`

| name        | type  | unit |
| ----------- | ----- | ---- |
| `latitude`  | float |      |
| `longitude` | float |      |

## Example

```typescript
const reply = await omni.command("GetCoordinates");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCoordinates</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCoordinatesRsp</Name>
  <Parameters>
    <Parameter name="Latitude" dataType="float">30.0</Parameter>
    <Parameter name="Longitude" dataType="float">-90.1</Parameter>
  </Parameters>
</Response>
```
