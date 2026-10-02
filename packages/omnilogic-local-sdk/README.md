# OmniLogicLocal SDK

TypeScript SDK for local control of Hayward OmniLogic pool controllers. No
internet or cloud login required.

> [!IMPORTANT]
>
> This SDK is currently in beta. It may contain bugs or change based on
> feedback.

## Features

- Access to the controller config, system info, and equipment telemetry
- Typed parameters and results for all 237 firmware-verified commands
- Built-in caching and throttling to prevent controller overload
- Equipment control through an API built on top of the command interface

> [!NOTE]
>
> Not all commands have been verified against real hardware. Some commands seem
> to be unusable, require certain setups and equipment, or may put your system
> in an undesirable state. The equipment control API has been tested against
> real hardware, has safeguards in place, and is the best way to access your
> equipment. Unverified hardware of a kind it already covers, such as other
> lights, relays, pumps, heaters, chlorinators, and Sense and Dispense, may work
> through it too. Anything it does not cover is reached with `command()`: those
> commands should work, but have not been confirmed.

## Requirements

- Node.js >= 22
- Hayward OmniLogic MSP firmware 5.2 (R0502000) or newer
- Network access to the OmniLogic controller on port 10444

## Installation

```bash
yarn add @rygine/omnilogic-local-sdk
# or
npm install @rygine/omnilogic-local-sdk
```

## Usage

```typescript
import { OmniLogic } from "@rygine/omnilogic-local-sdk";

const omni = new OmniLogic({ host: "192.168.1.100" });

// fetch the latest controller config and telemetry
await omni.refresh();

// access controller config and telemetry
console.log("Backyard name:", omni.config.backyard.name);
console.log("Air temp:", omni.telemetry.backyard.airTemp);

// send a raw command with typed parameters
const poolTemp = await omni.command("GetUIPoolTempCmd", { poolId: 1 });
console.log("Pool temp:", poolTemp.temp);

// or use the equipment API
console.log("Filter speed:", omni.backyard.pool?.filter?.speed);
console.log("Filter status:", omni.backyard.pool?.filter?.status);
```

## Supported hardware

The SDK should work with any equipment that a Hayward OmniLogic controller
supports. Hardware the equipment layer does not cover is controlled with
`command()`:

```typescript
import { timerParams } from "@rygine/omnilogic-local-sdk";

// turn on a piece of equipment by its id
await omni.command("SetUIEquipmentCmd", {
  poolId: 1,
  equipmentId: 12,
  isOn: 1,
  ...timerParams(),
});
```

## Disclaimer

This software is not produced, endorsed, or supported by Hayward Industries,
Inc. "Hayward" and "OmniLogic" are trademarks of their respective owners.
