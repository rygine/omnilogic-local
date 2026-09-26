import type { DeviceRow } from "@/client/equipment-rows";
import { favoriteTargetOf } from "@/client/favorites";
import { useFavorites, useSchedules } from "@/client/queries";
import { SuperchlorinateBadge } from "@/components/controls/ChlorinatorControl/SuperchlorinateBadge";
import { CountdownBadge } from "@/components/controls/CountdownTimer/CountdownBadge";
import { EquipmentCard } from "@/components/EquipmentCard/EquipmentCard";
import type { BowDetail } from "@/server/serializers";

// a device's card on the Equipment and Favorites pages
export const DeviceCard = ({
  bow,
  row: r,
  onSelect,
  favoriteMarker = true,
}: {
  bow: BowDetail;
  row: DeviceRow;
  onSelect: () => void;
  favoriteMarker?: boolean;
}) => {
  const favorites = useFavorites();
  const schedules = useSchedules();

  // spillover's records are the filter's with the spillover type
  const target = favoriteTargetOf(bow, r);
  const favorite =
    favoriteMarker &&
    favorites.data?.some(
      (f) => f.equipmentId === target.equipmentId && f.data === target.data,
    );
  const scheduleId = r.kind === "spillover" ? bow.filters[0]?.id : r.id;
  const scheduleCount =
    schedules.data?.filter(
      (s) =>
        s.equipmentId === scheduleId &&
        (r.kind === "spillover"
          ? s.type === "spillover"
          : s.type !== "spillover"),
    ).length ?? 0;

  const running =
    r.kind === "chlorinator" &&
    bow.chlorinators.find((c) => c.id === r.id)?.superchlorinating;
  // spillover's countdown is read against the filter's id
  const countdownId = r.kind === "spillover" ? bow.filters[0]?.id : r.id;
  // polled for any on device that can count down
  const mayCountDown =
    r.countdown === true ||
    (r.on &&
      (r.kind === "light" ||
        r.kind === "relay" ||
        r.kind === "filter" ||
        r.kind === "spillover"));

  return (
    <EquipmentCard
      device={r}
      onSelect={onSelect}
      markers={{ favorite, schedules: scheduleCount }}
      extra={
        running ? (
          <SuperchlorinateBadge bowId={bow.id} />
        ) : mayCountDown && countdownId !== undefined ? (
          <CountdownBadge bowId={bow.id} equipmentId={countdownId} />
        ) : undefined
      }
    />
  );
};
