// the access log's sortable columns, shared by the query and the page's URL
export const LOG_SORT_KEYS = ["time", "op", "durationMs"] as const;
export type LogSortKey = (typeof LOG_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";
