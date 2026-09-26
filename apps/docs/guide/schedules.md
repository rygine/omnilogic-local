# Schedules

A schedule runs one piece of equipment in a daily window. At the start time, the
controller sends one command with one value. At the end time, it turns the
equipment off.

```typescript
import { SCHEDULE_EVERY_DAY } from "@rygine/omnilogic-local-sdk";

await omni.refresh();

const schedule = await omni.backyard.schedules.create({
  // the pool filter's id: omni.backyard.pool?.filter?.equipmentId
  equipmentId: 3,
  // the speed for a filter
  data: 80,
  startHour: 9,
  endHour: 17,
  days: SCHEDULE_EVERY_DAY,
});
// 28
console.log(schedule.scheduleSystemId);
```

`data` is the value the schedule applies:

- a speed for a filter
- a show for a light
- a set point for a heater
- a percent for a chlorinator
- 1 for a relay

## Reading

```typescript
// every schedule in the configuration
omni.backyard.schedules.list();
// the schedules for equipment 8
omni.backyard.schedules.for(8);
// one, by its scheduleSystemId
omni.backyard.schedules.get(28);
```

## Days, sunrise, and sunset

`days` combines day flags with `|`, Monday first: `SCHEDULE_MONDAY` through
`SCHEDULE_SUNDAY`, or `SCHEDULE_EVERY_DAY`. A start or end at sunrise or sunset
uses the hour `SCHEDULE_SUNRISE_HOUR` or `SCHEDULE_SUNSET_HOUR` with the minute
`SCHEDULE_SUNRISE_SUNSET_MINUTE`. The controller calculates the times from its
location.

```typescript
import {
  SCHEDULE_MONDAY,
  SCHEDULE_FRIDAY,
  SCHEDULE_SUNSET_HOUR,
  SCHEDULE_SUNRISE_SUNSET_MINUTE,
} from "@rygine/omnilogic-local-sdk";

await omni.backyard.schedules.create({
  equipmentId: 8,
  // a light show
  data: 6,
  // at sunset
  startHour: SCHEDULE_SUNSET_HOUR,
  startMinute: SCHEDULE_SUNRISE_SUNSET_MINUTE,
  endHour: 23,
  days: SCHEDULE_MONDAY | SCHEDULE_FRIDAY,
});
```

`enabled` and `recurring` default to true. For
[spillover](/guide/equipment#spillover), schedule the filter of the body of
water with `type: "spillover"` and the speed as `data`.

## Updating

```typescript
await omni.backyard.schedules.update(28, {
  endHour: 18,
  days: SCHEDULE_EVERY_DAY,
});
await omni.backyard.schedules.setEnabled(28, false);
await omni.backyard.schedules.remove(28);
```

The controller takes a whole schedule, not a change to one, so `update` fills
every field you leave out from the cached configuration. If someone changed a
field at the panel after your last refresh, `update` overwrites it with the
cached value. If that matters, call `refresh({ refetch: true })` first.

## Verifying a change

`create`, `update`, `setEnabled`, and `remove` each refresh after they send and
verify the change before they resolve. If the change never shows, they throw
`CommandFailedError`. `{ attempts }` sends the command again before they throw.
