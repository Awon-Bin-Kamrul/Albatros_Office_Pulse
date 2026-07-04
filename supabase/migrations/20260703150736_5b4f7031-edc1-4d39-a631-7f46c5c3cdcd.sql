
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============== TABLES ===============
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('fan','light')),
  room text NOT NULL CHECK (room IN ('drawing_room','work_room_1','work_room_2')),
  status boolean NOT NULL DEFAULT false,
  power_watts numeric NOT NULL,
  last_changed timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.devices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devices are publicly readable" ON public.devices FOR SELECT USING (true);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room text NOT NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('after_hours','prolonged_usage')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alerts are publicly readable" ON public.alerts FOR SELECT USING (true);

CREATE TABLE public.power_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_watts numeric NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.power_log TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.power_log TO authenticated;
GRANT ALL ON public.power_log TO service_role;
ALTER TABLE public.power_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Power log is publicly readable" ON public.power_log FOR SELECT USING (true);

-- =============== REALTIME ===============
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- =============== SEED ===============
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['drawing_room','work_room_1','work_room_2'] LOOP
    INSERT INTO public.devices (name, type, room, power_watts) VALUES
      ('Fan 1','fan',r,60),
      ('Fan 2','fan',r,60),
      ('Light 1','light',r,15),
      ('Light 2','light',r,15),
      ('Light 3','light',r,15);
  END LOOP;
END $$;

-- =============== SIMULATOR ===============
CREATE OR REPLACE FUNCTION public.simulate_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pick_count int := 1 + floor(random() * 3)::int; -- 1..3
  is_work_hours boolean;
  h int := extract(hour from now() at time zone 'UTC')::int;
  target_status boolean;
  d record;
  total numeric;
BEGIN
  is_work_hours := (h >= 9 AND h < 17);

  FOR d IN
    SELECT id FROM public.devices ORDER BY random() LIMIT pick_count
  LOOP
    IF is_work_hours THEN
      target_status := (random() < 0.7); -- 70% ON
    ELSE
      -- 70% OFF, but ~1 in 6 leaves it ON (organic after-hours)
      IF random() < (1.0/6.0) THEN
        target_status := true;
      ELSE
        target_status := (random() >= 0.7);
      END IF;
    END IF;

    UPDATE public.devices
      SET status = target_status, last_changed = now()
      WHERE id = d.id AND status IS DISTINCT FROM target_status;
  END LOOP;

  SELECT COALESCE(sum(power_watts),0) INTO total
    FROM public.devices WHERE status = true;
  INSERT INTO public.power_log (total_watts) VALUES (total);
END $$;

-- =============== ALERT CHECKER ===============
CREATE OR REPLACE FUNCTION public.check_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h int := extract(hour from now() at time zone 'UTC')::int;
  is_after_hours boolean;
  d record;
  r record;
  room_name text;
  all_on boolean;
  oldest_change timestamptz;
  fans_on int;
  lights_on int;
  msg text;
BEGIN
  is_after_hours := (h < 9 OR h >= 17);

  -- 1. After-hours per-device alerts
  IF is_after_hours THEN
    FOR d IN
      SELECT id, name, room FROM public.devices WHERE status = true
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE device_id = d.id
          AND alert_type = 'after_hours'
          AND resolved = false
          AND created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.alerts (room, device_id, alert_type, message)
        VALUES (
          d.room,
          d.id,
          'after_hours',
          d.name || ' in ' || d.room || ' is still ON after hours'
        );
      END IF;
    END LOOP;
  END IF;

  -- 2. Prolonged usage per-room alerts
  FOREACH room_name IN ARRAY ARRAY['drawing_room','work_room_1','work_room_2'] LOOP
    SELECT bool_and(status), max(last_changed)
      INTO all_on, oldest_change
    FROM public.devices WHERE room = room_name;

    -- all ON and oldest_change (the most recent change among them) > 2h ago
    IF all_on AND oldest_change < now() - interval '2 hours' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE room = room_name
          AND alert_type = 'prolonged_usage'
          AND resolved = false
          AND created_at > now() - interval '1 hour'
      ) THEN
        SELECT count(*) FILTER (WHERE type='fan' AND status),
               count(*) FILTER (WHERE type='light' AND status)
          INTO fans_on, lights_on
          FROM public.devices WHERE room = room_name;
        msg := 'All devices in ' || room_name || ' have been running for over 2 hours ('
               || fans_on || ' fans, ' || lights_on || ' lights ON)';
        INSERT INTO public.alerts (room, device_id, alert_type, message)
        VALUES (room_name, NULL, 'prolonged_usage', msg);
      END IF;
    END IF;
  END LOOP;
END $$;

-- =============== DISCORD WEBHOOK TRIGGER ON NEW ALERTS ===============
CREATE OR REPLACE FUNCTION public.notify_discord_on_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url text := 'https://vwdoqjfzxsoungqnkuuf.supabase.co/functions/v1/discord-alert-webhook';
BEGIN
  PERFORM net.http_post(
    url := fn_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'id', NEW.id,
      'room', NEW.room,
      'alert_type', NEW.alert_type,
      'message', NEW.message,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

CREATE TRIGGER alerts_discord_notify
AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_discord_on_alert();

-- =============== CRON SCHEDULES ===============
SELECT cron.schedule('office-pulse-simulate', '* * * * *', $$SELECT public.simulate_devices();$$);
SELECT cron.schedule('office-pulse-check-alerts', '*/5 * * * *', $$SELECT public.check_alerts();$$);
