---
opcode: 112
area: panel
status: verified
summary: Reads the panel backlight's idle timeout in seconds.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetBackLightTimeout

<CommandFacts />

Reads the panel backlight's idle timeout in seconds.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1112" />

`GetBackLightTimeoutRsp`

| name      | type | unit   |
| --------- | ---- | ------ |
| `timeout` | int  | second |

## Example

```typescript
const reply = await omni.command("GetBackLightTimeout");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLightTimeout</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetBackLightTimeoutRsp</Name>
  <Parameters>
    <Parameter name="Timeout" dataType="int" unit="second">30</Parameter>
  </Parameters>
</Response>
```
