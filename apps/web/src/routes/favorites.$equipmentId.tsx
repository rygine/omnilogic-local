import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useFavorites } from "@/client/queries";
import { EquipmentControlModal } from "@/components/controls/EquipmentControl/EquipmentControlModal";
import { ThemeModal } from "@/components/ThemeModal/ThemeModal";
import { THEME_FAVORITE_DATA } from "@/shared/spillover";

// a favorite is a device or a theme, told apart by the record's marker
const FavoriteControlRoute = () => {
  const navigate = useNavigate();
  const { equipmentId } = Route.useParams();
  const id = Number(equipmentId);
  const favorites = useFavorites();
  const onExited = () => void navigate({ to: "/favorites" });
  return favorites.data?.some(
    (f) => f.equipmentId === id && f.data === THEME_FAVORITE_DATA,
  ) ? (
    <ThemeModal themeId={id} onExited={onExited} />
  ) : (
    <EquipmentControlModal equipmentId={id} onExited={onExited} />
  );
};

export const Route = createFileRoute("/favorites/$equipmentId")({
  component: FavoriteControlRoute,
});
