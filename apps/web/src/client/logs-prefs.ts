import { createStoredValue } from "@/client/stored";
import { isOneOf } from "@/shared/guards";

// the Logs page's results per page
export const PAGE_SIZE_CHOICES = [10, 25, 50, 100] as const;

const isPageSize = isOneOf([...PAGE_SIZE_CHOICES]);

const store = createStoredValue<number>({
  key: "omni.logs.pageSize",
  fallback: 100,
  parse: (raw) => {
    const n = Number(raw);
    return isPageSize(n) ? n : undefined;
  },
  serialize: String,
});

export const setLogsPageSize = store.set;
export const useLogsPageSize = store.use;
