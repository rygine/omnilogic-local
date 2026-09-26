---
opcode: 416
area: panel
status: verified
summary: >-
  Sets the controller's latitude and longitude, which it uses to schedule events
  at sunrise and sunset.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# SetCoordinates

<CommandFacts />

Sets the controller's latitude and longitude, which it uses to schedule events
at sunrise and sunset.

## Parameters

| name        | type  | notes |
| ----------- | ----- | ----- |
| `latitude`  | float |       |
| `longitude` | float |       |

## Reply

Acknowledged only. The controller sends no reply.

## Example

```typescript
await omni.command("SetCoordinates", {
  latitude: 0,
  longitude: 0,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>SetCoordinates</Name>
  <Parameters>
    <Parameter name="latitude" dataType="float">0</Parameter>
    <Parameter name="longitude" dataType="float">0</Parameter>
  </Parameters>
</Request>
```

## Response XML

None.
