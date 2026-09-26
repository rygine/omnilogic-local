import type { OmniLogic, WriteOptions } from "@/client/omnilogic";
import { OmniValidationError } from "@/utils/errors";
import { matches } from "@/utils/helpers";

// the data a theme favorite carries in place of a show
export const THEME_FAVORITE_DATA = 268435455;

export type FavoriteCreate = {
  equipmentId: number;
  // the show number for a light, 0 for anything else
  data: number;
};

export class Favorites {
  #omni: OmniLogic;

  constructor(omni: OmniLogic) {
    this.#omni = omni;
  }

  list() {
    return this.#omni.config.favorites;
  }

  get(indexId: number) {
    return this.list().find((f) => f.indexId === indexId);
  }

  async create(spec: FavoriteCreate, options: WriteOptions = {}) {
    const record = { equipmentIdOrThemeId: spec.equipmentId, data: spec.data };
    const before = new Set(this.list().map((f) => f.systemId));
    const created = () =>
      this.list().find((f) => !before.has(f.systemId) && matches(f, record));
    await this.#omni.command(
      "CreateUIFavoriteCmd",
      { equipmentId: spec.equipmentId, data: spec.data },
      {
        verify: () => created() !== undefined,
        attempts: options.attempts,
        failure: `Unable to create favorite for equipment ${spec.equipmentId}`,
      },
    );
    return created()!;
  }

  createForTheme(themeId: number, options: WriteOptions = {}) {
    return this.create(
      { equipmentId: themeId, data: THEME_FAVORITE_DATA },
      options,
    );
  }

  async remove(indexId: number, options: WriteOptions = {}) {
    const favorite = this.get(indexId);
    if (favorite === undefined) {
      throw new OmniValidationError(
        `No favorite at index ${indexId} in the cached config`,
      );
    }
    // a favorite is identified by its system id, an index is a display slot
    const removed = favorite.systemId;
    await this.#omni.command(
      "DeleteUIFavoriteCmd",
      { data: indexId },
      {
        verify: () => !this.list().some((f) => f.systemId === removed),
        attempts: options.attempts,
        failure: `Unable to delete favorite ${indexId}`,
      },
    );
  }
}
