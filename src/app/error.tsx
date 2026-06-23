'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log client-side so issues are diagnosable; no stack/secret is shown to users.
    console.error('Application error:', error.message, error.digest);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="mt-6 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        We hit an unexpected error. Your booking progress is saved where possible. Please try again, or
        contact support if the problem continues.
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/"><Button variant="outline">Back to home</Button></Link>
      </div>
    </div>
  );
}
