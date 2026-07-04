import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/components/dashboard/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Office Pulse — Live IoT Monitoring" },
      { name: "description", content: "Real-time office IoT dashboard: live device status, power draw, and after-hours alerts." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Dashboard />;
}
