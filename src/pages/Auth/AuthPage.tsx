import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { signIn, signUp } from '@/services/supabase/database';
import { useAuthStore } from '@/store/authStore';
import { Button, Input, Card } from '@/components/common';
import { APP_NAME } from '@/constants';

export function AuthPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const data = await signIn(email, password);
        setUser(data.user);
        navigate('/');
      } else {
        // Sign up - then switch to sign in mode
        await signUp(email, password);
        setMode('signin');
        setPassword('');
        setError(
          'Account created! Please sign in with your credentials.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentication failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-9">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
            className="w-[72px] h-[72px] mx-auto rounded-[12px] bg-primary flex items-center justify-center mb-5 shadow-button"
          >
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </motion.div>
          <h1 className="text-[32px] font-bold text-text tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-secondary mt-2 text-[15px]">
            Your smart medication companion
          </p>
        </div>

        <Card className="p-6">
          {/* Mode Toggle — pill-shaped */}
          <div className="flex gap-2 mb-6 bg-surface-muted rounded-pill p-1">
            <button
              onClick={() => setMode('signin')}
              className={`
                flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200
                ${mode === 'signin'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-secondary hover:text-text'}
              `}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`
                flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200
                ${mode === 'signup'
                  ? 'bg-primary text-white shadow-button'
                  : 'text-secondary hover:text-text'}
              `}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-[18px] h-[18px]" strokeWidth={2} />}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-[18px] h-[18px]" strokeWidth={2} />}
              required
              minLength={6}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-[13px] rounded-[14px] p-3 ${
                  error.startsWith('Account created')
                    ? 'text-mint-deep bg-mint-soft'
                    : 'text-rose-deep bg-rose-soft'
                }`}
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="min-h-[56px]"
            >
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-secondary mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
          Your medication data is securely stored
        </p>
      </motion.div>
    </div>
  );
}