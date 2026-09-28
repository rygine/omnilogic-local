import {
  Button,
  Code,
  ColorSwatch,
  Group,
  MultiSelect,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useState } from "react";

import {
  PAGE_SIZE_CHOICES,
  setLogsPageSize,
  useLogsPageSize,
} from "@/client/logs-prefs";
import { Empty } from "@/components/Empty/Empty";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { LoadError } from "@/components/LoadError/LoadError";
import { getLogOperations, getLogs } from "@/server/fns/logs";
import type { LogEntry } from "@/server/log/query";
import { isOneOf, isStringArray } from "@/shared/guards";
import {
  LOG_SORT_KEYS,
  type LogSortKey,
  type SortDirection,
} from "@/shared/log-sort";

// the result filter, as it appears in the URL
type Result = "ok" | "failed";

const RESULT_OPTIONS: { value: Result; label: string }[] = [
  { value: "ok", label: "Ok" },
  { value: "failed", label: "Failed" },
];

const isResult = (v: unknown): v is Result =>
  RESULT_OPTIONS.some((o) => o.value === v);

// the columns, in display order
const COLUMNS: { value: LogSortKey; label: string }[] = [
  { value: "op", label: "Operation" },
  { value: "durationMs", label: "Duration" },
  { value: "time", label: "Time" },
];

const isSortKey = isOneOf([...LOG_SORT_KEYS]);

const isDirection = isOneOf<SortDirection>(["asc", "desc"]);

// absent means the default
type LogsSearch = {
  result?: Result;
  ops?: string[];
  sort?: LogSortKey;
  dir?: SortDirection;
  page?: number;
};

const NOWRAP = { whiteSpace: "nowrap" } as const;

// the viewer's locale: "9/3/26, 9:19:07 PM"
const SHORT_TIME = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

// each key's natural first direction: newest, A–Z, ok first, quickest
const defaultDirection = (sort: LogSortKey): SortDirection =>
  sort === "time" ? "desc" : "asc";

// the controller access log, a failed row opening to show its error text
const Logs = () => {
  // the result set's shape lives in the URL, results per page is a browser preference
  const {
    result,
    ops = [],
    sort = "time",
    dir = defaultDirection(sort),
    page = 1,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pageSize = useLogsPageSize();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const setPage = (next: number) =>
    void navigate({
      search: (prev) => ({ ...prev, page: next === 1 ? undefined : next }),
      replace: true,
    });
  // a filter or sort change starts over from the first page
  const update = (patch: Omit<LogsSearch, "page">) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: undefined }),
      replace: true,
    });
  // sorts by the column, flipping the direction on the active one
  const sortBy = (next: LogSortKey) => {
    const nextDir =
      next === sort ? (dir === "asc" ? "desc" : "asc") : defaultDirection(next);
    update({
      sort: next === "time" ? undefined : next,
      dir: nextDir === defaultDirection(next) ? undefined : nextDir,
    });
  };

  const operations = useQuery({
    queryKey: ["logs", "operations"],
    queryFn: () => getLogOperations(),
    staleTime: 60_000,
  });

  const q = useQuery({
    queryKey: ["logs", { result, ops, sort, dir, page, pageSize }],
    queryFn: () =>
      getLogs({
        data: {
          ok: result === undefined ? undefined : result === "ok",
          ops: ops.length > 0 ? ops : undefined,
          sort,
          dir,
          page,
          pageSize,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  return (
    <ContentLayout title="Logs">
      <Group mb="md" align="flex-end" justify="space-between">
        <Group align="flex-end">
          <Select
            label="Result"
            placeholder="All"
            clearable
            data={RESULT_OPTIONS}
            value={result ?? null}
            onChange={(value) =>
              update({ result: isResult(value) ? value : undefined })
            }
            w={120}
          />
          <MultiSelect
            label="Operations"
            placeholder={ops.length === 0 ? "All" : undefined}
            data={
              // a selected operation stays in the list
              [...new Set([...(operations.data ?? []), ...ops])].toSorted()
            }
            value={ops}
            onChange={(value) =>
              update({ ops: value.length > 0 ? value : undefined })
            }
            searchable
            clearable
            hidePickedOptions
            checkIconPosition="right"
            miw={240}
          />
        </Group>
        <Button onClick={() => void q.refetch()} loading={q.isFetching}>
          Refresh
        </Button>
      </Group>

      {q.isPending ? (
        <LogsSkeleton />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : q.data.entries.length === 0 ? (
        <Empty of="log entries" />
      ) : (
        <>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="md">
              Page {page} of {Math.max(q.data.pageCount, 1)} · {q.data.total}{" "}
              results
            </Text>
            <PerPage pageSize={pageSize} />
          </Group>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {COLUMNS.map((column) => (
                  <SortHeader
                    key={column.value}
                    label={column.label}
                    active={sort === column.value}
                    dir={dir}
                    align={column.value === "durationMs" ? "right" : "left"}
                    narrow={column.value !== "op"}
                    onClick={() => sortBy(column.value)}
                  />
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {q.data.entries.map((entry, i) => {
                const key = `${page}-${i}`;
                const errors = entry.errors ?? [];
                const expandable = errors.length > 0;
                const open = expandable && expanded.has(key);
                return (
                  <Fragment key={key}>
                    <Table.Tr
                      onClick={expandable ? () => toggle(key) : undefined}
                      style={{
                        cursor: expandable ? "pointer" : undefined,
                        // the error sits directly under its row
                        borderBottom: open ? "none" : undefined,
                      }}
                      aria-expanded={expandable ? open : undefined}>
                      <Table.Td fw={600}>
                        <Group gap="xs" wrap="nowrap">
                          <ResultDot entry={entry} />
                          <span>{entry.op}</span>
                        </Group>
                      </Table.Td>
                      {/* these take only their text's width */}
                      <Table.Td ta="right" ff="monospace" w={1} style={NOWRAP}>
                        {entry.durationMs}ms
                      </Table.Td>
                      <Table.Td ff="monospace" fz="sm" w={1} style={NOWRAP}>
                        {SHORT_TIME.format(entry.time)}
                      </Table.Td>
                    </Table.Tr>
                    {open && (
                      <Table.Tr>
                        <Table.Td colSpan={COLUMNS.length} pt={0}>
                          {errors.map((err, j) => (
                            <Code
                              key={j}
                              block
                              c="red"
                              style={{ whiteSpace: "pre-wrap" }}>
                              {err}
                            </Code>
                          ))}
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
          <Group justify="space-between" align="center" mt="md">
            <Pagination
              total={Math.max(q.data.pageCount, 1)}
              value={page}
              onChange={setPage}
              siblings={1}
              boundaries={1}
              withEdges
              size="md"
            />
            <PerPage pageSize={pageSize} />
          </Group>
        </>
      )}
    </ContentLayout>
  );
};

// a green or red dot before the operation
const ResultDot = ({ entry }: { entry: LogEntry }) => {
  // an access with error text counts as failed
  const failed = !entry.ok || (entry.errors?.length ?? 0) > 0;
  return (
    <ColorSwatch
      color={`var(--mantine-color-${failed ? "red" : "green"}-6)`}
      size={10}
      withShadow={false}
      title={failed ? "failed" : "ok"}
      aria-label={failed ? "failed" : "ok"}
      style={{ flexShrink: 0 }}
    />
  );
};

// a header that sorts by its column, the active one showing the direction
const SortHeader = ({
  label,
  active,
  dir,
  align,
  narrow,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDirection;
  align: "left" | "right";
  // shrink to the content's width
  narrow?: boolean;
  onClick: () => void;
}) => (
  <Table.Th
    ta={align}
    w={narrow ? 1 : undefined}
    style={NOWRAP}
    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
    <UnstyledButton onClick={onClick} fw={700} fz="sm">
      <Group
        gap={4}
        wrap="nowrap"
        justify={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        <Text component="span" size="xs" c={active ? undefined : "dimmed"}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </Text>
      </Group>
    </UnstyledButton>
  </Table.Th>
);

const PerPage = ({ pageSize }: { pageSize: number }) => (
  <Group gap="xs" align="center" wrap="nowrap">
    <Select
      aria-label="Results per page"
      data={PAGE_SIZE_CHOICES.map(String)}
      value={String(pageSize)}
      onChange={(v) => {
        if (v !== null) {
          setLogsPageSize(Number(v));
        }
      }}
      allowDeselect={false}
      checkIconPosition="right"
      size="sm"
      w={80}
    />
    <Text size="md">per page</Text>
  </Group>
);

// the page line and a page of rows
const LogsSkeleton = () => (
  <Stack gap="xs">
    <Skeleton height={16} width={180} mb="xs" radius="sm" />
    {Array.from({ length: 10 }, (_, i) => (
      <Skeleton key={i} height={44} radius="sm" />
    ))}
  </Stack>
);

export const Route = createFileRoute("/logs")({
  component: Logs,
  validateSearch: (search: Record<string, unknown>): LogsSearch => {
    const page = Number(search.page);
    const ops = isStringArray(search.ops)
      ? search.ops.filter((op) => op !== "")
      : [];
    return {
      result: isResult(search.result) ? search.result : undefined,
      ops: ops.length > 0 ? ops : undefined,
      sort: isSortKey(search.sort) ? search.sort : undefined,
      dir: isDirection(search.dir) ? search.dir : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    };
  },
  head: () => ({ meta: [{ title: "OmniLogicLocal - Logs" }] }),
});
