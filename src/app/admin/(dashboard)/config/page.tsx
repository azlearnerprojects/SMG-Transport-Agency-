import type { Metadata } from 'next';
import { AdminConfigClient } from '@/components/admin/admin-config-client';
import { AdminPageTitle, RestrictedNotice } from '@/components/admin/admin-ui';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { getPublicSiteConfig } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Admin - Config' };

export default async function AdminConfigPage() {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['operations_manager', 'finance_officer'])) {
    return <RestrictedNotice module="Admin Config" />;
  }

  const result = await getPublicSiteConfig();
  return (
    <>
      <AdminPageTitle
        title="Admin Config"
        description="Manage safe public runtime settings, booking switches, provider flags, and customer support defaults."
      />
      <AdminConfigClient initial={result.config} configured={result.configured} />
    </>
  );
}
