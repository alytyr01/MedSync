// Supabase Edge Function: send-reminder-push
// Sends Web Push for due medication reminders (cron triggered).
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@medsync.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ') || !SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { data: reminders, error: rErr } = await supabase
      .from('reminder_notifications')
      .select('*')
      .lte('scheduled_for', new Date().toISOString())
      .is('sent_at', null)
      .limit(100);
    if (rErr) throw rErr;

    let sent = 0;
    let failed = 0;
    const userIds = [...new Set((reminders ?? []).map((r: any) => r.user_id))];

    if (userIds.length > 0) {
      const { data: subs, error: sErr } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds);
      if (sErr) throw sErr;

      for (const reminder of reminders ?? []) {
        const userSubs = (subs ?? []).filter((s: any) => s.user_id === reminder.user_id);

        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: reminder.title,
                body: reminder.body,
                url: '/',
                medicineId: reminder.medicine_id,
                scheduledTime: reminder.time_key,
                reminderId: reminder.id,
              }),
              { TTL: 120 }
            );
            sent += 1;
          } catch (pushErr: any) {
            failed += 1;
            if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }

        await supabase
          .from('reminder_notifications')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', reminder.id);
      }
    }

    return json({ sent, failed, due: (reminders ?? []).length }, 200);
  } catch (error) {
    console.error('send-reminder-push error:', error);
    return json({ error: String(error) }, 500);
  }
});

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}