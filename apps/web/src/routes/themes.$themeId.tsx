import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ThemeModal } from "@/components/ThemeModal/ThemeModal";

const ThemeRoute = () => {
  const navigate = useNavigate();
  const { themeId } = Route.useParams();
  return (
    <ThemeModal
      themeId={Number(themeId)}
      onExited={() => void navigate({ to: "/themes" })}
    />
  );
};

export const Route = createFileRoute("/themes/$themeId")({
  component: ThemeRoute,
});
