---
opcode: 108
area: panel
status: verified
summary: Reads whether the panel's backlight is on.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetBackLight

<CommandFacts />

Reads whether the panel's backlight is on.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1108" />

`GetBackLightRsp`

| name    | type | unit |
| ------- | ---- | ---- |
| `state` | bool |      |

## Example

```typescript
const reply = await omni.command("GetBackLight");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLight</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLightRsp</Name>
  <Parameters>
    <Parameter name="State" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
