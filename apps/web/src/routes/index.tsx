import { createFileRoute, redirect } from "@tanstack/react-router";

// / sends you to /equipment
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/equipment" });
  },
});
