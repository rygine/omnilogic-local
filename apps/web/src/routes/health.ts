import { createFileRoute } from "@tanstack/react-router";

// unauthenticated, for the image's HEALTHCHECK
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: () => Response.json({ ok: true }),
    },
  },
});
