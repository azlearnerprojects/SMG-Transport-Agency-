import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Staff Sign In');

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
