---
opcode: 411
area: system
status: verified
summary: >-
  Fetches the controller's component inventory: every board, its Hayward Unique
  Address, and its firmware version.
firmware:
  - R0502000
models:
  - OmniLogic MSP
---

# GetSysInfo

<CommandFacts />

Fetches the controller's component inventory: every board, its Hayward Unique
Address, and its firmware version.

It takes no parameters and replies with the inventory.

## Request XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Request xmlns="http://nextgen.hayward.com/api">
  <Name>GetSysInfo</Name>
</Request>
```

## Response XML

A trimmed reply. A full reply lists every component on the controller's bus.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<SysInfo>
  <Parameter name="NumComponents" dataType="int">2</Parameter>
  <Component>
    <Parameter name="DevName" dataType="string">MSP</Parameter>
    <Parameter name="Type" dataType="string">MSP</Parameter>
    <Parameter name="HUA" dataType="string">00-1a-2b-3c-4d</Parameter>
    <Parameter name="Version" dataType="string">R0502000</Parameter>
    <Parameter name="NodeID" dataType="int">-1</Parameter>
    <Parameter name="SystemID" dataType="int">1</Parameter>
    <Parameter name="UpgradeCapable" dataType="int">1</Parameter>
  </Component>
  <Component>
    <Parameter name="DevName" dataType="string">VSP</Parameter>
    <Parameter name="Type" dataType="string">EPNS</Parameter>
    <Parameter name="HUA" dataType="string">00-33-44-55-66</Parameter>
    <Parameter name="Version" dataType="string">R 1.0.15</Parameter>
    <Parameter name="NodeID" dataType="int">22</Parameter>
    <Parameter name="SystemID" dataType="int">-1</Parameter>
    <Parameter name="UpgradeCapable" dataType="int">0</Parameter>
  </Component>
</SysInfo>
```
