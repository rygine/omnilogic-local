import {
  createContext,
  useContext,
  useId,
  useState,
  useSyncExternalStore,
} from "react";

// the hooks ResponsiveModal shares with its content

// the modal's animated close, for nested content
export const ModalCloseContext = createContext<() => void>(() => {});
export const useModalClose = (): (() => void) => useContext(ModalCloseContext);

// while any reporter holds an unapplied edit, Esc and the backdrop keep the modal open
type DirtyStore = {
  entries: Map<string, boolean>;
  listeners: Set<() => void>;
};
export const createDirtyStore = (): DirtyStore => ({
  entries: new Map(),
  listeners: new Set(),
});
export const anyDirty = (store: DirtyStore): boolean =>
  [...store.entries.values()].some(Boolean);
const notify = (store: DirtyStore): void => {
  queueMicrotask(() => {
    for (const l of store.listeners) {
      l();
    }
  });
};
const reportTo = (store: DirtyStore, id: string, dirty: boolean): void => {
  if (store.entries.get(id) === dirty) {
    return;
  }
  const before = anyDirty(store);
  store.entries.set(id, dirty);
  if (anyDirty(store) !== before) {
    notify(store);
  }
};

export const ModalDirtyContext = createContext<DirtyStore | undefined>(
  undefined,
);

// reports from inside a modal whether an edit is unapplied
export const useModalDirty = (dirty: boolean): void => {
  const store = useContext(ModalDirtyContext);
  const id = useId();
  // unmounting drops this entry
  const [subscribe] = useState(() => () => () => {
    if (store === undefined) {
      return;
    }
    const had = anyDirty(store);
    store.entries.delete(id);
    if (anyDirty(store) !== had) {
      notify(store);
    }
  });
  useSyncExternalStore(
    subscribe,
    () => 0,
    () => 0,
  );
  if (store !== undefined) {
    reportTo(store, id, dirty);
  }
};
