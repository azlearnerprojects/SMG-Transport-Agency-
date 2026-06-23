'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { registerSchema } from '@/lib/schemas';
import type { z } from 'zod';

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useCustomerAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterInput) {
    setLoading(true);
    setError(null);
    const res = await registerUser({
      email: values.email,
      fullName: values.fullName,
      phone: values.phone,
      password: values.password,
    });
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Could not create account.');
    else router.push('/dashboard');
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            An account lets you manage trips, store passenger details and re-download tickets. You can also
            book as a guest without an account.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
              <Input id="fullName" {...register('fullName')} aria-invalid={!!errors.fullName} />
            </Field>
            <Field label="Email" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Phone" htmlFor="phone" required error={errors.phone?.message} hint="e.g. 0241234567">
              <Input id="phone" type="tel" {...register('phone')} aria-invalid={!!errors.phone} />
            </Field>
            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <Input id="password" type="password" {...register('password')} aria-invalid={!!errors.password} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" required error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
            </Field>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            Already have an account? <Link href="/login" className="text-navy underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
