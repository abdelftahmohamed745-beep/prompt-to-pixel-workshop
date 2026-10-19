import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FullLoader } from "@/components/forge/common";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ForgeFE — Describe it, preview it, ship it" },
      { name: "description", content: "ForgeFE is an AI website builder: describe a site, inspect a live preview and review every code change." },
      { property: "og:title", content: "ForgeFE — Describe it, preview it, ship it" },
      { property: "og:description", content: "Describe a site, inspect a live preview and review every code change." },
    ],
  }),
  component: Index,
});

function Index() {
  const { ready, session } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready) navigate({ to: session ? "/dashboard" : "/login", replace: true });
  }, [ready, session, navigate]);
  return <FullLoader />;
}
