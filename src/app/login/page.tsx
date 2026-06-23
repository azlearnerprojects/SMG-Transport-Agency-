'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';
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
  const { user, login } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to SMG</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
}
