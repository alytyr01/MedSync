import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Info,
  LogOut,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { Card, Toggle, Button } from '@/components/common';
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
  const navigate = useNavigate();
  const { settings, updateSettings, toggleDarkMode } = useSettingsStore();
  const { user, signOut } = useAuthStore();

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="px-6">
      <header className="flex items-center gap-3 pt-8 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-surface-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <h1 className="text-[26px] font-bold text-text tracking-tight">
          Settings
        </h1>
      </header>

      <div className="space-y-8">
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

        <SettingsSection title="Appearance">
          <Toggle
            checked={settings.darkMode}
            onChange={toggleDarkMode}
            label="Dark Mode"
            description="Use dark theme throughout the app"
          />
        </SettingsSection>

        <SettingsSection title="Emergency">
          <button
            onClick={() => navigate('/contacts')}
            className="w-full flex items-center justify-between py-3.5"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[14px] bg-blue-soft flex items-center justify-center">
                <Users className="w-[18px] h-[18px] text-blue-deep" strokeWidth={2} />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-medium text-text">
                  Emergency Contacts
                </p>
                <p className="text-[13px] text-secondary">
                  Manage your emergency contacts
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary" strokeWidth={2} />
          </button>
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

        {user && (
          <SettingsSection title="Account">
            <div className="flex items-center gap-3.5 py-3.5">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.email?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text truncate">
                  {user.email}
                </p>
                <p className="text-[13px] text-secondary">Signed in</p>
              </div>
            </div>
            <div className="pt-3 pb-2">
              <Button variant="outline" fullWidth onClick={handleSignOut}>
                <LogOut className="w-4 h-4" strokeWidth={2} /> Sign Out
              </Button>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  );
}
