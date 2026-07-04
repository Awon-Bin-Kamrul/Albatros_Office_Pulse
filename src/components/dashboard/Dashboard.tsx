import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ROOMS,
  prettyRoom,
  relativeTime,
  onDuration,
  type Device,
  type Alert,
  type Room,
} from "@/lib/office-pulse";
import { Fan, Lightbulb, Activity, Bell, ShieldCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loaded, setLoaded] = useState(false);
  const now = useNow(1000);

  // initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: d }, { data: a }] = await Promise.all([
        supabase.from("devices").select("*").order("room").order("type").order("name"),
        supabase.from("alerts").select("*").eq("resolved", false).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (d) setDevices(d as unknown as Device[]);
      if (a) setAlerts(a as unknown as Alert[]);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("office-pulse")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        (payload) => {
          setDevices((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Device];
            if (payload.eventType === "DELETE") return prev.filter((d) => d.id !== (payload.old as Device).id);
            const next = payload.new as Device;
            return prev.map((d) => (d.id === next.id ? next : d));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload) => {
          setAlerts((prev) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as Alert;
              return n.resolved ? prev : [n, ...prev];
            }
            if (payload.eventType === "DELETE") return prev.filter((a) => a.id !== (payload.old as Alert).id);
            const n = payload.new as Alert;
            if (n.resolved) return prev.filter((a) => a.id !== n.id);
            const exists = prev.some((a) => a.id === n.id);
            return exists ? prev.map((a) => (a.id === n.id ? n : a)) : [n, ...prev];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totalWatts = useMemo(
    () => devices.filter((d) => d.status).reduce((s, d) => s + Number(d.power_watts), 0),
    [devices],
  );
  const perRoomWatts = useMemo(() => {
    const map = new Map<Room, number>();
    ROOMS.forEach((r) => map.set(r, 0));
    for (const d of devices) if (d.status) map.set(d.room, (map.get(d.room) ?? 0) + Number(d.power_watts));
    return map;
  }, [devices]);
  const roomMax = Math.max(1, ...Array.from(perRoomWatts.values()));

  const clock = now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
  const dateStr = now ? now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) : "";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
        <Header clock={clock} dateStr={dateStr} totalWatts={totalWatts} loaded={loaded} />
        <FloorPlan devices={devices} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <DeviceStatusPanel devices={devices} />
          </div>
          <div className="space-y-6">
            <PowerMeter total={totalWatts} perRoom={perRoomWatts} max={roomMax} />
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
        <footer className="pt-4 pb-8 text-center text-xs text-muted-foreground">
          Office Pulse · realtime data
        </footer>
      </div>
    </div>
  );
}

/* ----------------- Header ----------------- */
function Header({ clock, dateStr, totalWatts, loaded }: { clock: string; dateStr: string; totalWatts: number; loaded: boolean }) {
  return (
    <header className="card-surface p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-xl grid place-items-center bg-primary/15 border border-primary/30">
          <Activity className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Office Pulse</h1>
          <p className="text-sm text-muted-foreground">Live IoT monitoring · {dateStr}</p>
        </div>
      </div>
      <div className="md:ml-auto flex items-center gap-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Local time</div>
          <div className="num-hero text-2xl md:text-3xl">{clock}</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total draw</div>
          <div className="num-hero text-4xl md:text-6xl font-bold text-primary" style={{ textShadow: "0 0 32px color-mix(in oklab, var(--primary) 40%, transparent)" }}>
            {loaded ? totalWatts : "—"}<span className="text-xl md:text-2xl text-primary/70 ml-1">W</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ----------------- Floor Plan ----------------- */
function FloorPlan({ devices }: { devices: Device[] }) {
  return (
    <section className="grid gap-5 md:grid-cols-3">
      {ROOMS.map((r) => (
        <RoomCard key={r} room={r} devices={devices.filter((d) => d.room === r)} />
      ))}
    </section>
  );
}

function RoomCard({ room, devices }: { room: Room; devices: Device[] }) {
  const onCount = devices.filter((d) => d.status).length;
  const fans = devices.filter((d) => d.type === "fan");
  const lights = devices.filter((d) => d.type === "light");
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">{prettyRoom(room)}</h2>
        <span className={`text-xs px-2 py-1 rounded-full border ${onCount > 0 ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
          {onCount} / {devices.length} on
        </span>
      </div>
      <div className="rounded-xl border border-border/60 bg-background/40 p-5 min-h-40">
        <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Fans</div>
        <div className="flex gap-4 mb-5">
          {fans.map((d) => <DeviceIcon key={d.id} device={d} />)}
        </div>
        <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Lights</div>
        <div className="flex gap-4">
          {lights.map((d) => <DeviceIcon key={d.id} device={d} />)}
        </div>
      </div>
    </div>
  );
}

function DeviceIcon({ device }: { device: Device }) {
  const Icon = device.type === "fan" ? Fan : Lightbulb;
  const cls = device.type === "fan"
    ? (device.status ? "fan-on" : "fan-off")
    : (device.status ? "light-on" : "light-off");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="size-12 rounded-lg grid place-items-center bg-card/60 border border-border hover:border-primary/50 transition-colors"
          aria-label={`${device.name} — ${device.status ? "ON" : "OFF"}`}
        >
          <Icon className={`size-6 ${cls}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-56">
        <div className="space-y-1">
          <div className="font-semibold">{device.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{device.type} · {device.power_watts}W</div>
          <div className="text-sm">
            <span className={device.status ? "text-primary" : "text-muted-foreground"}>
              {device.status ? "● ON" : "○ OFF"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {device.status ? onDuration(device.last_changed) : `off · changed ${relativeTime(device.last_changed)}`}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ----------------- Device Status Panel ----------------- */
function DeviceStatusPanel({ devices }: { devices: Device[] }) {
  return (
    <section className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Live device status</h2>
        <span className="text-xs text-muted-foreground">{devices.length} devices</span>
      </div>
      <div className="space-y-5">
        {ROOMS.map((r) => (
          <div key={r}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{prettyRoom(r)}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {devices.filter((d) => d.room === r).map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
                  {d.type === "fan"
                    ? <Fan className={`size-4 ${d.status ? "fan-on" : "fan-off"}`} />
                    : <Lightbulb className={`size-4 ${d.status ? "light-on" : "light-off"}`} />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.power_watts}W · {relativeTime(d.last_changed)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.status ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted/40 text-muted-foreground border border-border"}`}>
                    {d.status ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------- Power Meter ----------------- */
function PowerMeter({ total, perRoom, max }: { total: number; perRoom: Map<Room, number>; max: number }) {
  return (
    <section className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="size-4 text-primary" />
        <h2 className="font-semibold text-lg">Power consumption</h2>
      </div>
      <div className="num-hero text-5xl font-bold text-primary mb-1">{total}<span className="text-lg text-primary/70 ml-1">W</span></div>
      <div className="text-xs text-muted-foreground mb-4">Live total across all rooms</div>
      <div className="space-y-3">
        {ROOMS.map((r) => {
          const w = perRoom.get(r) ?? 0;
          const pct = (w / max) * 100;
          return (
            <div key={r}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{prettyRoom(r)}</span>
                <span className="num-hero font-semibold">{w}W</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--primary), var(--accent))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ----------------- Alerts Panel ----------------- */
function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="card-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="size-4 text-warn" />
        <h2 className="font-semibold text-lg">Active alerts</h2>
        <span className="ml-auto text-xs text-muted-foreground">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShieldCheck className="size-8 text-primary/70 mb-2" />
          <div className="text-sm font-medium">No active alerts</div>
          <div className="text-xs text-muted-foreground">All clear.</div>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {alerts.map((a) => (
            <li key={a.id} className="alert-strip rounded-md px-3 py-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-warn">
                  {a.alert_type === "prolonged_usage" ? "prolonged" : "after hours"}
                </span>
                <span className="text-[11px] text-muted-foreground">· {prettyRoom(a.room)}</span>
                <span className="ml-auto text-[10px] text-muted-foreground num-hero">{relativeTime(a.created_at)}</span>
              </div>
              <div className="text-sm">{a.message}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
