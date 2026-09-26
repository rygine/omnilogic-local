---
opcode: 167
area: system
status: verified
summary: Reads a six-byte version record from the chlorinator bus.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetScVersionCmd

<CommandFacts />

Reads a six-byte version record from the chlorinator bus.

## Parameters

| name   | type | notes                                  |
| ------ | ---- | -------------------------------------- |
| `data` | int  | non-zero asks the bus. 0 gets no reply |

## Reply

<Pill label="Opcode" value="1167" />

`GetScVersionRsp`

| name         | type | unit |
| ------------ | ---- | ---- |
| `stageMajor` | byte |      |
| `minorRev`   | byte |      |
| `incremRev`  | byte |      |
| `specRev1`   | byte |      |
| `specRev2`   | byte |      |
| `specRev3`   | byte |      |

## Example

```typescript
const reply = await omni.command("GetScVersionCmd", {
  data: 1,
});
```

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetScVersionCmd</Name>
  <Parameters>
    <Parameter name="data" dataType="int">1</Parameter>
  </Parameters>
</Request>
```

## Response XML

Captured with the pump off and the cell idle.

```xml
<Response xmlns="http://nextgen.hayward.com/api">
  <Name>GetScVersionRsp</Name>
  <Parameters>
    <Parameter name="StageMajor" dataType="byte">100</Parameter>
    <Parameter name="MinorRev" dataType="byte">4</Parameter>
    <Parameter name="IncremRev" dataType="byte">0</Parameter>
    <Parameter name="SpecRev1" dataType="byte">0</Parameter>
    <Parameter name="SpecRev2" dataType="byte">0</Parameter>
    <Parameter name="SpecRev3" dataType="byte">0</Parameter>
  </Parameters>
</Response>
```
