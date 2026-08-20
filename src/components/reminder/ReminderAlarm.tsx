import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, X } from 'lucide-react';
import { useReminderAlarmStore } from '@/store/reminderAlarmStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatTime } from '@/utils/format';
import { Button } from '@/components/common';

interface ReminderAlarmProps {
  onTaken: (medicineId: string, time: string) => void;
  onSkip: (medicineId: string, time: string) => void;
  onSnooze: (medicineId: string, time: string) => void;
}

export function ReminderAlarm({ onTaken, onSkip, onSnooze }: ReminderAlarmProps) {
  const { activeAlarm, dismissAlarm, snoozeAlarm } = useReminderAlarmStore();
  const { settings } = useSettingsStore();

  // Play alarm sound when alarm triggers
  useEffect(() => {
    if (activeAlarm && settings.reminderSound) {
      // Create a beep sound using Web Audio API
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playBeep = () => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.5);
        };
        // Play beep 3 times
        playBeep();
        setTimeout(playBeep, 600);
        setTimeout(playBeep, 1200);
        return () => {
          ctx.close();
        };
      }
    }
  }, [activeAlarm, settings.reminderSound]);

  // Vibrate when alarm triggers
  useEffect(() => {
    if (activeAlarm && settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }, [activeAlarm, settings.vibration]);

  if (!activeAlarm) return null;

  const { medicine, time } = activeAlarm;

  const handleTaken = () => {
    onTaken(medicine.id, time);
    dismissAlarm();
  };

  const handleSkip = () => {
    onSkip(medicine.id, time);
    dismissAlarm();
  };

  const handleSnooze = () => {
    onSnooze(medicine.id, time);
    snoozeAlarm(10);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Alarm Card */}
        <motion.div
          className="relative w-full max-w-sm bg-surface rounded-[32px] shadow-modal overflow-hidden"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="px-7 pt-8 pb-7 text-center">
            {/* Alarm icon */}
            <motion.div
              className="w-20 h-20 mx-auto mb-5 bg-primary-soft rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              <Bell className="w-9 h-9 text-primary" strokeWidth={2.2} />
            </motion.div>

            {/* Time */}
            <p className="text-[13px] font-semibold text-primary uppercase tracking-wider mb-1">
              Time to take your medicine
            </p>

            {/* Medicine name */}
            <h2 className="text-[28px] font-bold text-text tracking-tight leading-tight mb-1">
              {medicine.name}
            </h2>

            {/* Dosage */}
            <p className="text-[16px] text-secondary font-medium mb-1">
              {medicine.dosage}
            </p>

            {/* Scheduled time */}
            <div className="flex items-center justify-center gap-1.5 text-text-tertiary mb-7">
              <Clock className="w-4 h-4" strokeWidth={2} />
              <span className="text-[14px] font-medium">
                Scheduled for {formatTime(time)}
              </span>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleTaken}
                size="md"
                fullWidth
                className="bg-primary text-white"
              >
                <Check className="w-5 h-5" strokeWidth={2.2} />
                I've Taken It
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleSnooze}
                  size="md"
                  variant="secondary"
                  className="bg-yellow-soft text-yellow-deep hover:bg-yellow-soft/70"
                >
                  <Clock className="w-4 h-4" strokeWidth={2} />
                  Snooze 10m
                </Button>
                <Button
                  onClick={handleSkip}
                  size="md"
                  variant="outline"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}