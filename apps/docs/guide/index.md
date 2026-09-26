# Getting started

## Overview

This SDK talks to a Hayward OmniLogic controller over your local network. It
reads the controller's live telemetry and its configuration, changes its
settings, and controls attached equipment.

## Requirements

- Node.js >= 22
- A Hayward OmniLogic controller on your local network, reachable on UDP port
  10444

See [Supported hardware](/guide/hardware).

## Installing

```bash
yarn add @rygine/omnilogic-local-sdk
# or
npm install @rygine/omnilogic-local-sdk
```
