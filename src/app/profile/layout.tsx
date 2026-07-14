import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Customer Profile');

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
