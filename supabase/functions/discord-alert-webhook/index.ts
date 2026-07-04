// Posts formatted Office Pulse alerts to a Discord channel via webhook.
// Triggered by a Postgres AFTER INSERT trigger on public.alerts using pg_net.

const WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");

const prettyRoom = (r: string) =>
  r === "drawing_room" ? "Drawing Room"
  : r === "work_room_1" ? "Work Room 1"
  : r === "work_room_2" ? "Work Room 2"
  : r;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!WEBHOOK_URL) {
    console.error("DISCORD_WEBHOOK_URL not configured");
    return new Response("Webhook URL not configured", { status: 500 });
  }

  let payload: {
    id?: string;
    room?: string;
    alert_type?: string;
    message?: string;
    created_at?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const room = prettyRoom(payload.room ?? "unknown");
  const emoji = payload.alert_type === "prolonged_usage" ? "⏱️" : "⚠️";
  const kind = payload.alert_type === "prolonged_usage" ? "Prolonged usage" : "After-hours activity";

  const content = `${emoji} **${kind}** — ${room}\n${payload.message ?? ""}`;

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Discord webhook failed:", res.status, t);
    return new Response("Discord post failed", { status: 502 });
  }

  return new Response("ok");
});
