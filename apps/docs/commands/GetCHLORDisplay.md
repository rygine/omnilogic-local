---
opcode: 124
area: chlorinator
status: verified
summary: Reads whether the panel labels the chlorinator as Salt or Minerals.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetCHLORDisplay

<CommandFacts />

Reads whether the panel labels the chlorinator as Salt or Minerals.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1124" />

`GetCHLORDisplayRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetCHLORDisplay");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORDisplay</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetCHLORDisplayRsp</Name>
  <Parameters>
    <Parameter name="Enabled" dataType="bool">1</Parameter>
  </Parameters>
</Response>
```
