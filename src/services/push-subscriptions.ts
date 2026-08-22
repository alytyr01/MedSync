import { Capacitor } from '@capacitor/core';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/store/authStore';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

export async function syncPushSubscription(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) return true;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (!VAPID_PUBLIC_KEY) return false;

  const user = useAuthStore.getState().user;
  if (!user) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await upsertSubscription(existing, user.id);
      return true;
    }

    const granted =
      Notification.permission === 'granted' ||
      (await Notification.requestPermission()) === 'granted';
    if (!granted) return false;

    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await upsertSubscription(newSub, user.id);
    return true;
  } catch (error) {
    console.error('Failed to sync push subscription:', error);
    return false;
  }
}

export async function clearPushSubscription(): Promise<void> {
  // On native, there is no service worker / web push. But we must still
  // delete any push_subscriptions rows in the database for this user so
  // the cron edge function (send-reminder-push) does NOT send a regular
  // push notification to the device. The native full-screen alarm handles
  // everything on Android.
  const user = useAuthStore.getState().user;
  if (user) {
    try {
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to clear push subscriptions from database:', error);
    }
  }

  // On web, also unsubscribe the service worker push subscription
  if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    } catch (error) {
      console.error('Failed to clear push subscription:', error);
    }
  }
}

async function upsertSubscription(
  subscription: PushSubscription,
  userId: string
): Promise<void> {
  const { endpoint, keys } = subscription.toJSON() as any;
  const payload = {
    user_id: userId,
    endpoint,
    p256dh: keys?.p256dh ?? '',
    auth: keys?.auth ?? '',
    user_agent: navigator.userAgent,
  };

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' });

  if (error) {
    const { error: retryErr } = await supabase
      .from('push_subscriptions')
      .upsert(
        { endpoint, p256dh: payload.p256dh, auth: payload.auth, user_agent: payload.user_agent },
        { onConflict: 'endpoint' }
      );
    if (retryErr) throw error;
  }
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  const buffer = new ArrayBuffer(out.length);
  new Uint8Array(buffer).set(out);
  return new Uint8Array(buffer);
}