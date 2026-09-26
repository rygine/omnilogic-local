# Themes

A theme is a snapshot of the whole system, taken when you create it. It holds
one saved command per piece of equipment, including equipment that is off. When
you run the theme, the controller applies that snapshot.

```typescript
await omni.refresh();

// from the current state
const theme = await omni.backyard.themes.create("Party");
// 29
console.log(theme.systemId);

await omni.backyard.themes.run(theme.systemId);
```

Set the equipment the way you want it first, then create the theme.

## Reading

```typescript
// every theme in the configuration
omni.backyard.themes.list();
// the systemIds of the themes running now
omni.backyard.themes.activeIds;
// one, by its systemId
omni.backyard.themes.get(29);
```

## Running and stopping

`run` resolves when the controller acknowledges it. To see the theme's state,
refresh and read `omni.telemetry.themes`.

```typescript
await omni.backyard.themes.run(29);
```

After `run`, the controller is silent for a while. See
[The controller is silent after a theme write](#the-controller-is-silent-after-a-theme-write).

`run(29, false)` stops the theme. The controller turns off every piece of
equipment in the snapshot, and the theme shows as inactive. It does not restore
what ran before. When you run one theme, it stops all others.

`{ minutes }` runs the theme on the controller's own countdown, which stops it
when the time is up. Nothing reports the time left, so track it yourself if you
need to show it.

```typescript
await omni.backyard.themes.run(29, true, { minutes: 90 });
```

## Scheduling

You schedule a theme the same way as a piece of equipment. The window has the
same shape as a [schedule](/guide/schedules).

```typescript
import { SCHEDULE_EVERY_DAY } from "@rygine/omnilogic-local-sdk";

await omni.backyard.themes.schedule(29, {
  startHour: 19,
  endHour: 22,
  days: SCHEDULE_EVERY_DAY,
});
```

## Updating

`rename` refuses to send when another theme already has the name.

```typescript
await omni.backyard.themes.rename(29, "Evening");
await omni.backyard.themes.remove(29);
```

## The controller is silent after a theme write

When you create, remove, run, or stop a theme, the controller is silent for 12
to 22 seconds. The SDK holds every other operation until the controller answers
again. It does not drop them.

## Verifying a change

`create`, `rename`, `remove`, and `schedule` each refresh after they send and
verify the change before they resolve. If the change never shows, they throw
`CommandFailedError`. `create`, `rename`, and `remove` take `{ attempts }` to
send the command again before they throw.
