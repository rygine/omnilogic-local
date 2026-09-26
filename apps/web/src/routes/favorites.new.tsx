import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FavoritePicker } from "@/components/controls/FavoritePicker/FavoritePicker";
import { useModalClose } from "@/components/Modal/modal-state";
import { ResponsiveModal } from "@/components/Modal/ResponsiveModal";

const NewFavorite = () => {
  const navigate = useNavigate();
  return (
    <ResponsiveModal
      size="md"
      title="Add favorite"
      closeButton
      onExited={() => void navigate({ to: "/favorites" })}>
      <NewFavoriteBody />
    </ResponsiveModal>
  );
};

const NewFavoriteBody = () => {
  const close = useModalClose();
  return <FavoritePicker onDone={close} />;
};

export const Route = createFileRoute("/favorites/new")({
  component: NewFavorite,
});
