import type { Metadata } from 'next';
import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from '@/components/contact-form';
import { BRAND } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the SMG Transport Agency customer support team.',
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact us" subtitle="We're here to help with bookings, changes and any questions about your trip." />
      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-heading text-lg font-bold text-navy">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">Fill in the form and our team will respond as soon as possible.</p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6 text-sm">
              <h3 className="font-heading font-bold text-navy">Reach us directly</h3>
              <p className="text-xs text-muted-foreground">(Contact details are placeholders pending CEO approval.)</p>
              <ContactRow icon={Phone} label="Phone" value={BRAND.supportPhone} />
              <ContactRow icon={MessageCircle} label="WhatsApp" value={BRAND.whatsapp} />
              <ContactRow icon={Mail} label="Email" value={BRAND.email} />
              <ContactRow icon={MapPin} label="Office / terminal" value={BRAND.office} />
              <ContactRow icon={Clock} label="Support hours" value="Mon–Sun, 6:00–21:00 (placeholder)" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-sm">
              <h3 className="font-heading font-bold text-navy">Follow us</h3>
              <div className="mt-3 flex flex-wrap gap-3 text-navy">
                <a href={BRAND.social.facebook} className="underline">Facebook</a>
                <a href={BRAND.social.instagram} className="underline">Instagram</a>
                <a href={BRAND.social.twitter} className="underline">X</a>
                <a href={BRAND.social.tiktok} className="underline">TikTok</a>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ContactRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-gold" />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium text-navy">{value}</p>
      </div>
    </div>
  );
}
