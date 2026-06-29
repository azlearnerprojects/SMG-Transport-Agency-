'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BusFront, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { loginWithGoogle } = useCustomerAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Login failed.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      const signIn = await loginWithGoogle();
      if (!signIn.ok) {
        setError(signIn.error ?? 'Google sign-in failed.');
        return;
      }

      const auth = await getFirebaseAuth();
      const idToken = await auth?.currentUser?.getIdToken(true);
      if (!idToken) {
        setError('Google sign-in succeeded, but no Firebase ID token was returned.');
        return;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Access denied - this area is for authorized staff only.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-navy p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,193,7,0.20),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(79,155,232,0.20),transparent_32%)]" />
      <Card className="relative w-full max-w-md border-white/20 bg-white/95 shadow-card-hover backdrop-blur">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-lg bg-white p-2 shadow-card"><Logo /></div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-navy">
            <Sparkles className="size-3.5" /> Manage the movement
          </div>
          <CardTitle className="mt-2 flex items-center gap-2">
            <Lock className="size-5 text-gold" /> Staff sign in
          </CardTitle>
          <p className="text-sm text-muted-foreground">Your transport command center</p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="navy"
            className="w-full"
            disabled={googleLoading}
            onClick={submitGoogle}
          >
            {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            Preview access
            <span className="h-px flex-1 bg-border" />
          </div>

          <Alert variant="info" className="mb-4">
            <span className="text-xs">
              Preview admin: <strong>projects@azlearner.me</strong>, password <strong>Demo!Admin2026</strong>.
              Other demo staff: ops@smgtransport.test, inspector@smgtransport.test (same password).
            </span>
          </Alert>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Staff email" htmlFor="email" required>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password" htmlFor="password" required>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <BusFront className="size-4" />}
              Sign in with demo password
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Production uses Firebase Auth + role custom claims. No production password is stored in code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
