import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { AdminPageTitle, RestrictedNotice } from '@/components/admin/admin-ui';
import { SettingsForm } from '@/components/admin/settings-form';

export const metadata: Metadata = { title: 'Admin · System Settings' };

export default async function AdminSettings() {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['operations_manager', 'finance_officer'])) {
    return <RestrictedNotice module="System Settings" />;
  }
  const db = getDb();
  const settings = await db.getSettings();
  return (
    <>
      <AdminPageTitle title="System Settings" description="Configurable booking, cancellation and seat-hold policy values." />
      <SettingsForm initial={settings} />
    </>
  );
}
