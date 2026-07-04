export type Room = "drawing_room" | "work_room_1" | "work_room_2";
export type DeviceType = "fan" | "light";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  room: Room;
  status: boolean;
  power_watts: number;
  last_changed: string;
}

export interface Alert {
  id: string;
  room: string;
  device_id: string | null;
  alert_type: "after_hours" | "prolonged_usage";
  message: string;
  created_at: string;
  resolved: boolean;
}

export const ROOMS: Room[] = ["drawing_room", "work_room_1", "work_room_2"];

export const prettyRoom = (r: string) =>
  r === "drawing_room" ? "Drawing Room"
  : r === "work_room_1" ? "Work Room 1"
  : r === "work_room_2" ? "Work Room 2" : r;

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m ago` : `${h}h ago`;
}

export function onDuration(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.round(diff / 60000));
  if (m < 60) return `on for ${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `on for ${h}h ${rm}m` : `on for ${h}h`;
}
