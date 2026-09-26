# Favorites

A favorite bookmarks one piece of equipment on the panel and in the Hayward app.
It stores one equipment id and a `data` value.

```typescript
await omni.refresh();

const favorite = await omni.backyard.favorites.create({
  // the pool filter's id: omni.backyard.pool?.filter?.equipmentId
  equipmentId: 3,
  // a plain bookmark
  data: 0,
});
// 2
console.log(favorite.indexId);
```

`data` decides the favorite's name. For a light, the low byte (the lowest 8
bits) is a show, and the favorite takes the show's name. Any other favorite
takes the equipment's own name. It is not known whether the controller applies
the value when someone chooses the favorite.

## Reading

```typescript
// every favorite in the configuration
omni.backyard.favorites.list();
// one, by its indexId
omni.backyard.favorites.get(2);
```

## Bookmarking a theme

A favorite can bookmark a theme instead of a piece of equipment.

```typescript
await omni.backyard.favorites.createForTheme(29);
```

## Removing

```typescript
// by the favorite's indexId
await omni.backyard.favorites.remove(2);
```

## Updating

You cannot change a favorite's value in place. Remove it and create it again.

## Verifying a change

`create`, `createForTheme`, and `remove` each refresh after they send. Before
they resolve, they verify that the favorite appeared or disappeared. If the
change never shows, they throw `CommandFailedError`. `{ attempts }` sends the
command again before they throw.
