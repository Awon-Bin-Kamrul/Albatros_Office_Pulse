// Discord Interactions Endpoint for Office Pulse.
// - Verifies Ed25519 signature with DISCORD_PUBLIC_KEY
// - Handles PING and /status, /room, /usage slash commands.

import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
};

const prettyRoom = (r: string) =>
  r === "drawing_room" ? "Drawing Room"
  : r === "work_room_1" ? "Work Room 1"
  : r === "work_room_2" ? "Work Room 2" : r;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function reply(content: string) {
  return json({ type: 4, data: { content } });
}

async function roomSummary(roomFilter?: string) {
  let q = supabase.from("devices").select("room,type,status");
  if (roomFilter) q = q.eq("room", roomFilter);
  const { data, error } = await q;
  if (error || !data) return "Couldn't fetch device status.";
  const rooms = roomFilter ? [roomFilter] : ["drawing_room", "work_room_1", "work_room_2"];
  const parts: string[] = [];
  for (const r of rooms) {
    const devs = data.filter((d) => d.room === r);
    const fansOn = devs.filter((d) => d.type === "fan" && d.status).length;
    const lightsOn = devs.filter((d) => d.type === "light" && d.status).length;
    if (fansOn === 0 && lightsOn === 0) {
      parts.push(`${prettyRoom(r)}: all off.`);
    } else {
      const bits: string[] = [];
      if (fansOn) bits.push(`${fansOn} fan${fansOn === 1 ? "" : "s"} ON`);
      if (lightsOn) bits.push(`${lightsOn} light${lightsOn === 1 ? "" : "s"} ON`);
      parts.push(`${prettyRoom(r)}: ${bits.join(", ")}.`);
    }
  }
  return parts.join(" ");
}

async function usageSummary() {
  const { data: devs } = await supabase
    .from("devices")
    .select("power_watts,status")
    .eq("status", true);
  const currentW = (devs ?? []).reduce((s, d) => s + Number(d.power_watts), 0);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data: logs } = await supabase
    .from("power_log")
    .select("total_watts")
    .gte("logged_at", startOfDay.toISOString());
  // each log point represents prior 60s at that wattage → watt-seconds/3.6M = kWh
  const wattSeconds = (logs ?? []).reduce((s, l) => s + Number(l.total_watts) * 60, 0);
  const kwh = wattSeconds / 3_600_000;
  return `Total power right now: ${currentW}W. Today's estimated usage: ${kwh.toFixed(1)} kWh.`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  const raw = await req.text();
  if (!sig || !ts || !PUBLIC_KEY) return new Response("invalid request signature", { status: 401 });

  const ok = nacl.sign.detached.verify(
    new TextEncoder().encode(ts + raw),
    hexToBytes(sig),
    hexToBytes(PUBLIC_KEY),
  );
  if (!ok) return new Response("invalid request signature", { status: 401 });

  const body = JSON.parse(raw);

  // PING
  if (body.type === 1) return json({ type: 1 });

  // APPLICATION_COMMAND
  if (body.type === 2) {
    const name = body.data?.name as string;
    try {
      if (name === "status") return reply(await roomSummary());
      if (name === "room") {
        const opt = (body.data?.options ?? []).find((o: { name: string }) => o.name === "name");
        const roomVal = opt?.value as string | undefined;
        if (!roomVal) return reply("Please provide a room name.");
        return reply(await roomSummary(roomVal));
      }
      if (name === "usage") return reply(await usageSummary());
      return reply(`Unknown command: ${name}`);
    } catch (e) {
      console.error(e);
      return reply("Something went wrong handling that command.");
    }
  }

  return json({ error: "unhandled interaction type" }, 400);
});
