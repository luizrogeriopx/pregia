import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  head: () => ({ meta: [{ title: "Histórico — PregAI" }] }),
  component: () => (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Histórico</h1>
      <p className="text-muted-foreground">Disponível no plano Pro. Em breve.</p>
    </div>
  ),
});