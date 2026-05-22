import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({ meta: [{ title: "Plano — PregAI" }] }),
  component: () => (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Meu plano</h1>
      <p className="text-muted-foreground">Integração Stripe na próxima etapa.</p>
    </div>
  ),
});