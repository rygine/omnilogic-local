import { deviceRows, type DeviceRow } from "@/client/equipment-rows";
import type {
  BowDetail,
  FavoriteSummary,
  ThemeSummary,
} from "@/server/serializers";
import {
  SPILLOVER_FAVORITE_DATA,
  THEME_FAVORITE_DATA,
} from "@/shared/spillover";

// an equipment id plus data, 0 for a plain bookmark or the panel's marker for spillover
export type FavoriteTarget = { equipmentId: number; data: number };

type DeviceOnBody = {
  bowId: number;
  bodyName: string;
  device: DeviceRow;
  // the favorite record that stands for this device
  favorite: FavoriteTarget;
};

type FavoriteRow = DeviceOnBody & {
  // the display-slot id
  indexId: number;
};

export const favoriteTargetOf = (
  bow: BowDetail,
  device: DeviceRow,
): FavoriteTarget =>
  device.kind === "spillover"
    ? {
        equipmentId: bow.filters[0]?.id ?? device.id,
        data: SPILLOVER_FAVORITE_DATA,
      }
    : { equipmentId: device.id, data: 0 };

const keyOf = (t: FavoriteTarget): string => `${t.equipmentId}:${t.data}`;

const devicesByFavorite = (bows: BowDetail[]): Map<string, DeviceOnBody> => {
  const map = new Map<string, DeviceOnBody>();
  for (const bow of bows) {
    for (const device of deviceRows(bow)) {
      const favorite = favoriteTargetOf(bow, device);
      map.set(keyOf(favorite), {
        bowId: bow.id,
        bodyName: bow.name,
        device,
        favorite,
      });
    }
  }
  return map;
};

// favorites resolved to their devices, in the controller's order, skipping any that do not resolve
export const favoriteRows = (
  favorites: FavoriteSummary[],
  bows: BowDetail[],
): FavoriteRow[] => {
  const byKey = devicesByFavorite(bows);
  const rows: FavoriteRow[] = [];
  for (const f of favorites) {
    const found = byKey.get(keyOf(f));
    if (found) {
      rows.push({ indexId: f.indexId, ...found });
    }
  }
  return rows;
};

// the devices not yet favorited
export const favoritableDevices = (
  favorites: FavoriteSummary[],
  bows: BowDetail[],
): DeviceOnBody[] => {
  const taken = new Set(favorites.map(keyOf));
  return [...devicesByFavorite(bows).values()].filter(
    (d) => !taken.has(keyOf(d.favorite)),
  );
};

export type ThemeFavoriteRow = { indexId: number; theme: ThemeSummary };

// records carrying the theme marker whose id is a saved theme, in the controller's order
export const themeFavoriteRows = (
  favorites: FavoriteSummary[],
  themes: ThemeSummary[],
): ThemeFavoriteRow[] => {
  const byId = new Map(themes.map((t) => [t.id, t]));
  const rows: ThemeFavoriteRow[] = [];
  for (const f of favorites) {
    if (f.data !== THEME_FAVORITE_DATA) {
      continue;
    }
    const theme = byId.get(f.equipmentId);
    if (theme) {
      rows.push({ indexId: f.indexId, theme });
    }
  }
  return rows;
};
