import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Create Account');

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
