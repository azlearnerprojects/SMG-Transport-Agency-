import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata('Customer Sign In');

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
