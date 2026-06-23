import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-navy text-gold">
        <Compass className="size-8" />
      </div>
      <p className="mt-6 font-heading text-5xl font-extrabold text-navy">404</p>
      <h1 className="mt-2 text-xl font-bold">We can&rsquo;t find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you&rsquo;re looking for may have moved or no longer exists. Let&rsquo;s get you back on the road.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/"><Button>Back to home</Button></Link>
        <Link href="/book"><Button variant="outline">Book a trip</Button></Link>
      </div>
    </div>
  );
}
