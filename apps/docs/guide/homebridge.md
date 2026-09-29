# Homebridge plugin

`OmniLogicLocal` is a Homebridge platform plugin that puts a controller's
equipment in HomeKit over your local network.

## Installing

From the Homebridge terminal:

```bash
npm install @rygine/homebridge-omnilogic-local
```

Or search for "omnilogic" on the Homebridge UI's Plugins page and install it.

## Using the settings page

The plugin's settings page finds the controller's equipment. You then add
accessories from that equipment.

1. Enter the controller's **Host** (an IPv4 address or a host name) and
   **Port**, then click **Discover**. After the first time, the page runs
   **Discover** by itself each time it opens.
2. Click **Add accessory**, then pick the **Equipment** and the **Accessory**.
   The page suggests a **Name**.
3. Set the accessory's fields, then click **Add**.
4. Click the Homebridge UI's **Save**.

One piece of equipment can be several accessories. For example, a filter pump
can be a fan for its speed and also a switch that always turns it on at High.
Two accessories cannot share a name or be exact copies.

**Edit** changes an accessory. **Remove** takes it out of the list without
asking. A removed accessory leaves HomeKit at the next restart.

**Refresh (seconds)** sets how often the plugin refreshes from the controller.

If the page cannot reach the controller, it shows "Could not reach the
controller" and keeps the saved accessories.

## Accessories

After every command, the plugin refreshes from the controller over the next
minute. A tile then shows what the controller did, even when a valve or a light
is slow.

### Filter pump

**Accessories:** Fan, Switch

- **Off:** stops the pump.
- **Shows on:** while the pump reports a speed or is priming. A pump that is
  stopping shows as off.
- **After a start:** shows on until the controller reports a speed or priming.
  The limit is the priming duration plus 30 seconds, or 60 seconds if priming is
  off.
- **Priming:** after a pump starts with priming on, the plugin refuses commands
  to the pool and spa filter pumps for the priming duration plus 30 seconds, and
  while either pump reports priming.

#### Fan

- **On:** resumes the pump's last speed, or starts at Low if it has none.
- **Speed slider:** snaps to Low, Medium, and High, or moves freely across the
  pump's range. With Low, Medium, High, the last speed snaps to the nearest of
  the three.

#### Switch

- **On:** sends the **Speed when turned on** speed: the last speed, Low, Medium,
  High, or a custom percentage.

---

### Auxiliary pump

**Accessory:** Switch

- **On:** runs at the pump's last speed, or at 100 percent if it has none.
- **Off:** stops the pump.
- **Shows on:** while the pump reports a speed.
- No speed control.

---

### Heater

**Accessories:** Thermostat, Switch

- **Automatically turn off in:** [the plugin's timer](#the-plugin-s-timer).

#### Thermostat

- **Modes:** Off and Heat. On a heat source that also cools: Off, Heat, Cool,
  and Auto.
- **Current state:** Off while the heater is not running. While it runs, Auto
  shows Cool when the water is above the set point, and Heat otherwise.
- **Set point:** stays within the heater's range on the controller.
- **Current temperature:** the water temperature. It keeps its last reading
  while the pump is off and across a restart.

#### Switch

- **On:** sets the chosen set point and enables the heater.
- **Off:** disables the heater.
- **Shows on:** while the heater reports enabled.
- **Mode:** the Switch does not change the heater's mode. On a heat source that
  also cools, it runs in the mode the controller already has: Heat, Cool, or
  Auto. To pick a mode, use the Thermostat.

---

### Chlorinator

**Accessories:** Fan, Switch

- **Off:** disables the chlorinator.
- **Shows on:** while the chlorinator reports enabled.
- **Alerts and errors:** HomeKit does not show them. The Homebridge log names
  each change in the cell's alert or error status.

#### Fan

- **On:** enables the chlorinator.
- **Slider:** sets the output percentage, 1 to 100, immediately.

#### Switch

- **On:** sets the chosen output percentage, if it differs from the
  controller's, and enables the chlorinator.

---

### Spillover

**Accessories:** Fan, Switch

Spillover runs the shared pump and moves the return valve. These accessories are
for the pool of a pool and spa that share a pump.

- **Off:** stops spillover.
- **Shows on:** while the shared pump reports spillover.
- **After a start:** if the pump was off, shows on until the controller reports
  spillover, as a filter pump does, and the plugin refuses commands while the
  pump primes. If the pump was already on, shows on for up to 1 minute and does
  not wait for priming.
- **Automatically turn off in:**
  [the controller's countdown](#the-controller-s-countdown).

#### Fan

- **On:** runs spillover at the pump's last speed, or at Low if it has none.
- **Speed slider:** snaps to Low, Medium, and High, or moves freely across the
  pump's range, as on the filter pump Fan.

#### Switch

- **On:** sends the **Speed when turned on** speed, as on the filter pump
  Switch.

---

### Light

**Accessories:** Light, Light (one color), Switch

OmniDirect mode is a light mode that adds colors, a show speed, and a
brightness.

- **Off:** turns the light off.
- **Shows on:** while the light is lit.
- **Automatically turn off in:**
  [the controller's countdown](#the-controller-s-countdown).
- **Busy:** the plugin refuses a command to a light while the light is still
  changing, and until the first refresh, about 2 seconds after the last command.

#### Light

- **Color:** snaps to the nearest solid color the light supports. For an
  animated show, use the Switch or **Light (one color)**.
- **Brightness:** in OmniDirect mode, moves in steps of 20 percent and keeps the
  show and its speed.

#### Light (one color)

For a light in OmniDirect mode.

- **On:** turns the light on to the chosen color or show, at the chosen speed
  for a show.
- **Brightness:** moves in steps of 20 percent and keeps the show.

#### Switch

- **On:** sends the chosen show. In OmniDirect mode, it also sends the chosen
  speed and brightness.

---

### Relay

**Accessory:** Switch

- **On** and **Off**.
- **Automatically turn off in:**
  [the controller's countdown](#the-controller-s-countdown).
- The settings page lists a relay or light wired to the backyard, not to a pool
  or spa, under the backyard's heading. It works the same way.

---

### Theme

**Accessory:** Switch

- **Name:** the settings page suggests the theme's name, followed by "Theme".
- **On:** runs the theme and stops any other theme.
- **Off:** stops the theme and turns off every device it sets. It does not
  restore what ran before.
- **Shows on:** while the controller reports the theme running.
- **Automatically turn off in:**
  [the controller's countdown](#the-controller-s-countdown).
- **Delay:** after a theme starts or stops, the controller is silent for 12 to
  22 seconds. Other commands wait, and the tile updates once the controller
  responds.
- **Deleted theme:** a theme deleted on the panel or elsewhere leaves HomeKit at
  the next refresh. Until then, the plugin refuses a tap on it. The settings
  page shows it as [invalid](#invalid-accessories) until you remove it.

---

### Water temperature

**Accessory:** Temperature sensor

- **Pump off:** goes inactive and keeps its last reading, also across a restart.
- **First start:** if the pump is off the first time the plugin starts, shows
  0°C until the pump runs.
- **Shared pump:** on a pool and spa that share a pump, the spa shows the pool's
  reading while the pool runs.

---

### Air temperature

**Accessory:** Temperature sensor

The backyard air sensor.

## Turning off automatically

A heater, light, relay, theme, or spillover accessory can turn itself off a set
time after HomeKit turns it on. Set **Automatically turn off in** on the
accessory in the settings page, from 5 to 1439 minutes. 1439 minutes is 23 hours
and 59 minutes, the longest countdown the controller accepts.

It is a convenience. You can ask Siri for a timer at any time, but you have to
remember to. This one is set once, so equipment never stays on longer than you
meant. That matters most for a heater, which burns gas or electricity.

| Accessory                      | Timer                                                     |
| ------------------------------ | --------------------------------------------------------- |
| Light, relay, theme, spillover | [The controller's countdown](#the-controller-s-countdown) |
| Heater                         | [The plugin's timer](#the-plugin-s-timer)                 |

### The controller's countdown

- The plugin sends the countdown with the command that turns the device on. The
  controller then turns the device off itself, even while Homebridge is down.
- The controller does not report a theme's time left, so the tile shows a
  theme's end at the next refresh.

### The plugin's timer

- The controller has no countdown for a heater, so the plugin keeps its own
  timer and turns the heater off when the time is up.
- The plugin keeps the deadline across a restart. If it passes while Homebridge
  is down, the plugin turns the heater off when it starts.
- If you change the set point or mode, or turn the heater on again, the timer
  does not restart.
- If the heater turns off any other way, the timer stops.

## Temperatures and units

The controller reports every temperature in °F, whatever its units setting. That
setting only changes what its panel shows. The plugin converts readings to
Celsius for HomeKit, and the Home app shows them in the phone's units. A set
point you enter on the settings page is in °F. The thermostat's display unit
matches the controller's units setting.

## Configuring manually

You can edit the plugin's JSON configuration by hand instead of using the
[settings page](#using-the-settings-page). The settings page saves the same
configuration, in the form below. A mistake in the JSON can stop the plugin from
loading an accessory. See [Invalid accessories](#invalid-accessories).

```json
{
  "platform": "OmniLogicLocal",
  "controllers": [
    {
      "host": "192.168.1.100",
      "port": 10444,
      "pollInterval": 300,
      "accessories": [
        {
          "id": "a1b2c3",
          "type": "filterSwitch",
          "equipment": 3,
          "name": "Pool Filter Pump",
          "onSpeed": "high"
        },
        {
          "id": "d4e5f6",
          "type": "heaterSwitch",
          "equipment": 5,
          "name": "Pool Heater",
          "setPoint": 88,
          "offAfter": 60
        }
      ]
    }
  ]
}
```

### Fields

<table>
  <tr>
    <td style="vertical-align: top"><code>pollInterval</code></td>
    <td>How often, in seconds, the plugin refreshes from the controller. The settings page shows it as <strong>Refresh (seconds)</strong>. Default <code>300</code>, from <code>30</code> to <code>86400</code>. Changes made from HomeKit show immediately. Temperatures and changes made elsewhere update on this interval.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>id</code></td>
    <td>The settings page generates it when you add the accessory. It identifies the accessory in the configuration. HomeKit does not show it.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>type</code></td>
    <td>Which accessory this entry is: <code>filterFan</code>, <code>filterSwitch</code>, <code>pumpSwitch</code>, <code>heaterThermostat</code>, <code>heaterSwitch</code>, <code>chlorinatorFan</code>, <code>chlorinatorSwitch</code>, <code>spilloverFan</code>, <code>spilloverSwitch</code>, <code>light</code>, <code>lightSwitch</code>, <code>lightDimmer</code>, <code>relaySwitch</code>, <code>themeSwitch</code>, <code>waterTemp</code>, or <code>airTemp</code>.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>equipment</code></td>
    <td>The controller's id for the equipment this accessory controls. The settings page fills it in.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>name</code></td>
    <td>The accessory's name when HomeKit first adds it. The settings page suggests one from the equipment and the accessory's options. If you change it later, the accessory gets the new name in HomeKit at the next restart.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>fanSpeed</code></td>
    <td>On a filter or spillover accessory shown as a fan, <code>presets</code> snaps the slider to Low, Medium, and High. This is the default. <code>percent</code> lets the slider move to any percentage within the pump's range.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>onSpeed</code></td>
    <td>On a filter or spillover accessory shown as a switch, the speed the pump turns on at: <code>last</code>, <code>low</code>, <code>medium</code>, <code>high</code>, or <code>custom</code>. The default is <code>last</code>.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>onPercent</code></td>
    <td>On a filter or spillover switch, the pump's speed in percent when <strong>Speed when turned on</strong> is Custom. It is required in that case and must be within the pump's range. On a chlorinator switch, the output percentage when on, 1 to 100.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>setPoint</code></td>
    <td>On a heater switch, the set point when the switch turns on, in °F, within the heater's range.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>offAfter</code></td>
    <td>Minutes, <code>5</code> to <code>1439</code>. The settings page shows it as <strong>Automatically turn off in</strong>. See <a href="#turning-off-automatically">Turning off automatically</a>.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>show</code></td>
    <td>Required on a light switch or one-color light: the show it turns on to, by its number in the light's own list.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>speed</code></td>
    <td>On an OmniDirect light switch or one-color light, how fast its show runs: <code>1/16x</code> to <code>16x</code>. If you leave it empty, the light keeps its current speed. The plugin drops an accessory that sets a speed with a solid color, or on a light that is not in OmniDirect mode. If the light of a light switch leaves OmniDirect mode while the plugin runs, the switch sends its show without the speed. The log says so.</td>
  </tr>
  <tr>
    <td style="vertical-align: top"><code>brightness</code></td>
    <td>On an OmniDirect light switch, its brightness in percent: 20, 40, 60, 80, or 100. If you leave it empty, the light keeps its current brightness. The plugin drops the accessory on a light not in OmniDirect mode. If the light leaves OmniDirect mode, the plugin leaves out the brightness and logs a line.</td>
  </tr>
</table>

## Invalid accessories

When Homebridge starts, the plugin checks every accessory. It drops any
accessory that has one of these problems:

- no id or name, or an id another accessory already uses
- an unknown type, or a setting its type does not take
- a value the settings page does not offer, or a number outside the range it
  shows
- a missing required value, such as a light switch's show
- a number that is not a whole number
- equipment the controller does not report

The log names each dropped accessory and its problem. The settings page lists it
under "INVALID" with what is wrong, such as "Relay 99 is not on the controller."
To use it again, remove it and add it again.

The plugin also drops a controller that has one of these problems:

- a host that is not an IPv4 address or a host name
- a port outside 1 to 65535
- a refresh interval outside 30 to 86400 seconds

## Faults

While the controller does not respond, every tile keeps its last values and
shows a fault until a refresh gets through.
