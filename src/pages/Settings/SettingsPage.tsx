import {
  Info,
  Shield,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { Card, Toggle } from '@/components/common';
import { APP_NAME, APP_VERSION } from '@/constants';
import { requestNotificationPermission } from '@/services/notifications';
import { clearPushSubscription } from '@/services/push-subscriptions';

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="eyebrow mb-2 px-2">{title}</h2>
      <Card className="p-2 px-4 divide-y divide-border-subtle">{children}</Card>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request notification permission (Android 13+). The full-screen
      // alarm, exact alarm, and battery optimization permissions are
      // managed by the system via App Info > Permissions.
      const granted = await requestNotificationPermission();
      if (!granted) return;
    } else {
      await clearPushSubscription();
    }
    updateSettings({ notificationsEnabled: enabled });
  };

  return (
    <div className="px-3">
      <header className="px-1 pt-8 pb-6">
        <h1 className="text-[32px] font-bold text-text tracking-tight leading-tight">
          Settings
        </h1>
      </header>

      <div className="space-y-5">
        <SettingsSection title="Notifications">
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={handleNotificationsToggle}
            label="Medication Reminders"
            description="Get notified when it's time to take your medicine"
          />
          <Toggle
            checked={settings.reminderSound}
            onChange={(checked) => updateSettings({ reminderSound: checked })}
            label="Reminder Sound"
            description="Play a sound with reminders"
            disabled={!settings.notificationsEnabled}
          />
          <Toggle
            checked={settings.vibration}
            onChange={(checked) => updateSettings({ vibration: checked })}
            label="Vibration"
            description="Vibrate when a reminder appears"
            disabled={!settings.notificationsEnabled}
          />
          <Toggle
            checked={settings.lowStockAlerts}
            onChange={(checked) => updateSettings({ lowStockAlerts: checked })}
            label="Low Stock Alerts"
            description="Notify when medicine stock is running low"
          />
        </SettingsSection>

        <SettingsSection title="About">
          <div className="flex items-center gap-3.5 py-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-mint-soft flex items-center justify-center">
              <Info className="w-[18px] h-[18px] text-mint-deep" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-text">{APP_NAME}</p>
              <p className="text-[13px] text-secondary">
                Version {APP_VERSION}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 py-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-violet-soft flex items-center justify-center">
              <Shield className="w-[18px] h-[18px] text-violet-deep" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[15px] font-medium text-text">Privacy</p>
              <p className="text-[13px] text-secondary">
                Your data is stored securely
              </p>
            </div>
          </div>
        </SettingsSection>


      </div>
    </div>
  );
}
