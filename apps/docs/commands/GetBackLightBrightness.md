---
opcode: 110
area: panel
status: verified
summary: Reads the panel backlight's brightness.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetBackLightBrightness

<CommandFacts />

Reads the panel backlight's brightness.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1110" />

`GetBackLightBrightnessRsp`

| name         | type | unit |
| ------------ | ---- | ---- |
| `brightness` | int  |      |

## Example

```typescript
const reply = await omni.command("GetBackLightBrightness");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLightBrightness</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLightBrightnessRsp</Name>
  <Parameters>
    <Parameter name="Brightness" dataType="int">100</Parameter>
  </Parameters>
</Response>
```
