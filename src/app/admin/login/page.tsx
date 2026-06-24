'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="grid min-h-screen place-items-center bg-navy p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2"><Logo /></div>
          <CardTitle className="flex items-center gap-2"><Lock className="size-5 text-gold" /> Staff sign in</CardTitle>
        </CardHeader>
        <CardContent>
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
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Sign in'}
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
