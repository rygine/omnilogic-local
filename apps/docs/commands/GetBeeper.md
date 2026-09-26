---
opcode: 114
area: panel
status: verified
summary: Reads whether the panel's touch beeper is on.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetBeeper

<CommandFacts />

Reads whether the panel's touch beeper is on.

## Parameters

None.

## Reply

<Pill label="Opcode" value="1114" />

`GetBeeperRsp`

| name      | type | unit |
| --------- | ---- | ---- |
| `enabled` | bool |      |

## Example

```typescript
const reply = await omni.command("GetBeeper");
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetBeeper</Name>
</Request>
```

## Response XML

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetBeeperRsp</Name>
  <Parameters>
    <Parameter name="Enabled" dataType="bool">0</Parameter>
  </Parameters>
</Response>
```
