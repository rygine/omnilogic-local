import { Text } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";

import styles from "./Tiles.module.css";

export type Tile = {
  label: string;
  value: ReactNode;
  // free text that takes a whole row
  wide?: boolean;
  // a phrase that needs two tiles' width
  span?: 2;
};

// label over bold value as a grid of fixed or 200px columns
export const Tiles = ({
  items,
  columns,
}: {
  items: Tile[];
  columns?: number;
}) => {
  const style: CSSProperties & Record<`--${string}`, string> =
    columns === undefined
      ? { "--tiles-min": "200px" }
      : { "--tiles-columns": `repeat(${columns}, minmax(0, 1fr))` };
  return (
    <div className={styles.tiles} style={style}>
      {items.map((t) => (
        <div
          key={t.label}
          className={styles.tile}
          data-wide={t.wide || undefined}
          data-span={t.wide ? undefined : t.span}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {t.label}
          </Text>
          <Text fz={t.wide ? "md" : "1.25rem"} fw={700} lh={1.2}>
            {t.value}
          </Text>
        </div>
      ))}
    </div>
  );
};

// the value centered with a fact in each corner
export const CornerTile = ({
  value,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}: {
  value: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}) => (
  <div className={`${styles.tile} ${styles.corners}`}>
    {topLeft !== undefined && (
      <span className={styles.corner} data-at="top-left">
        {topLeft}
      </span>
    )}
    {topRight !== undefined && (
      <span className={styles.corner} data-at="top-right">
        {topRight}
      </span>
    )}
    <Text fz="1.25rem" fw={700} lh={1.2}>
      {value}
    </Text>
    {bottomLeft !== undefined && (
      <span className={styles.corner} data-at="bottom-left">
        {bottomLeft}
      </span>
    )}
    {bottomRight !== undefined && (
      <span className={styles.corner} data-at="bottom-right">
        {bottomRight}
      </span>
    )}
  </div>
);

// a grid of caller-built tiles, same columns as Tiles
export const TileGrid = ({
  children,
  minWidth = 200,
}: {
  children: ReactNode;
  minWidth?: number;
}) => {
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--tiles-min": `${minWidth}px`,
  };
  return (
    <div className={styles.tiles} style={style}>
      {children}
    </div>
  );
};
