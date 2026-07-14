import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ContactForm } from '@/components/contact-form';
import { getPublicSiteConfig } from '@/lib/site-config';
import { buildRouteMetadata } from '@/lib/seo';

export const metadata = buildRouteMetadata('/contact');

export default async function ContactPage() {
  const { config: site } = await getPublicSiteConfig();
  const socials = [
    { label: 'Facebook', href: site.socialFacebook },
    { label: 'Instagram', href: site.socialInstagram },
    { label: 'X', href: site.socialTwitter },
    { label: 'TikTok', href: site.socialTiktok },
  ].filter((s) => s.href);

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
              <ContactRow icon={Phone} label="Phone" value={site.supportPhone} />
              <ContactRow icon={MessageCircle} label="WhatsApp" value={site.supportWhatsapp} />
              <ContactRow icon={Mail} label="Email" value={site.supportEmail} />
              <ContactRow icon={MapPin} label="Office / terminal" value={site.companyAddress} />
              <ContactRow icon={Clock} label="Support hours" value={site.supportHours} />
            </CardContent>
          </Card>
          {socials.length > 0 && (
            <Card>
              <CardContent className="p-6 text-sm">
                <h3 className="font-heading font-bold text-navy">Follow us</h3>
                <div className="mt-3 flex flex-wrap gap-3 text-navy">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="underline">
                      {s.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
