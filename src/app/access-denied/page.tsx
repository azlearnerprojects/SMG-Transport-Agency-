import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata(
  'Access Denied',
  'You do not have permission to access this SMG Transport Agency area.',
);

export default function AccessDeniedPage() {
  return (
    <div className="container-page grid min-h-[62vh] place-items-center py-16">
      <div className="max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-extrabold text-navy">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is only available to authorized SMG staff. Sign in with an approved account or return to the public site.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/admin/login"><Button variant="navy">Staff sign in</Button></Link>
          <Link href="/"><Button variant="outline">Back home</Button></Link>
        </div>
      </div>
    </div>
  );
}
