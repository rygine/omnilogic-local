import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { EquipmentControlModal } from "@/components/controls/EquipmentControl/EquipmentControlModal";

const EquipmentControlRoute = () => {
  const navigate = useNavigate();
  const { equipmentId } = Route.useParams();
  return (
    <EquipmentControlModal
      equipmentId={Number(equipmentId)}
      onExited={() => void navigate({ to: "/equipment" })}
    />
  );
};

export const Route = createFileRoute("/equipment/$equipmentId")({
  component: EquipmentControlRoute,
});
