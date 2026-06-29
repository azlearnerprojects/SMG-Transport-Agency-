'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { loginSchema } from '@/lib/schemas';
import type { z } from 'zod';

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginWithGoogle } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    setError(null);
    const res = await login(values.email, values.password);
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Sign in failed.');
    else router.push('/dashboard');
  }

  async function onGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    const res = await loginWithGoogle();
    setGoogleLoading(false);
    if (!res.ok) setError(res.error ?? 'Google sign-in failed.');
    else router.push('/dashboard');
  }

  return (
    <div className="relative overflow-hidden bg-cloud">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_18%_20%,rgba(255,193,7,0.24),transparent_30%),linear-gradient(135deg,#003366_0%,#1a5a96_58%,#001833_100%)]" />
      <div className="container-page relative flex min-h-[78vh] items-center justify-center py-12">
      <Card className="w-full max-w-md border-white/50 bg-white/90 shadow-card-hover backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-navy">
            <Sparkles className="size-3.5" /> Welcome aboard
          </div>
          <CardTitle>Sign in to SMG</CardTitle>
          <p className="text-sm text-muted-foreground">Book faster, manage trips, and keep your profile synced.</p>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="mb-4 w-full"
            disabled={googleLoading}
            onClick={onGoogleSignIn}
          >
            {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <span className="font-heading font-bold">G</span>}
            Continue with Google
          </Button>

          <Alert variant="info" className="mb-4">
            <span className="text-xs">
              Demo accounts (any password): <strong>ama@example.com</strong> or <strong>kofi@example.com</strong>.
            </span>
          </Alert>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input id="password" type="password" {...register('password')} aria-invalid={!!errors.password} />
            </Field>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Sign in
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-navy underline"
              onClick={() => setValue('email', 'ama@example.com')}
            >
              Use demo account
            </button>
            <Link href="/register" className="text-navy underline">Create an account</Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Password reset and email verification are wired through Firebase Auth in production (disabled in demo).
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
