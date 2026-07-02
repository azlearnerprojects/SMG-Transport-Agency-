import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Customer Dashboard');

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
