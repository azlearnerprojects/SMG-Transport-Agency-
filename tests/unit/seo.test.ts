import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadSeo(env: Record<string, string>) {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, ...env };
  return import('@/lib/seo');
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('SEO canonical URLs', () => {
  it('derives absolute URLs from NEXT_PUBLIC_APP_URL', async () => {
    const { CANONICAL_SITE_URL, absoluteUrl } = await loadSeo({
      NEXT_PUBLIC_APP_URL: 'https://preview.example.com/',
    });

    expect(CANONICAL_SITE_URL).toBe('https://preview.example.com');
    expect(absoluteUrl('/routes')).toBe('https://preview.example.com/routes');
    expect(absoluteUrl('book')).toBe('https://preview.example.com/book');
  });

  it('uses NEXT_PUBLIC_APP_URL for sitemap and robots output', async () => {
    vi.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_APP_URL: 'https://preview.example.com/',
    };

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import('@/app/sitemap'),
      import('@/app/robots'),
    ]);

    const entries = sitemap();
    expect(entries[0]?.url).toBe('https://preview.example.com/');
    expect(entries.find((entry) => entry.url.endsWith('/book'))?.url).toBe('https://preview.example.com/book');
    expect(robots().sitemap).toBe('https://preview.example.com/sitemap.xml');
  });

  it('wires the generated social preview image into route metadata', async () => {
    const { buildRouteMetadata } = await loadSeo({
      NEXT_PUBLIC_APP_URL: 'https://smgagencygh.com',
    });
    const metadata = buildRouteMetadata('/book');
    const openGraphImages = (metadata.openGraph as { images?: Array<Record<string, unknown>> })?.images ?? [];
    const twitter = metadata.twitter as {
      card?: string;
      creator?: string;
      images?: Array<Record<string, unknown>>;
      site?: string;
    };
    const image = {
      url: 'https://smgagencygh.com/brand/social-share.png',
      secureUrl: 'https://smgagencygh.com/brand/social-share.png',
      width: 1200,
      height: 630,
      alt: 'SMG Transport Agency social preview',
      type: 'image/png',
    };

    expect(openGraphImages[0]).toMatchObject(image);
    expect(twitter).toMatchObject({
      card: 'summary_large_image',
      site: '@smgtransport',
      creator: '@smgtransport',
    });
    expect(twitter.images?.[0]).toMatchObject(image);
  });
});

describe('JSON-LD serialization', () => {
  it('escapes script-breaking less-than characters while preserving valid JSON', async () => {
    const { serializeJsonLd } = await loadSeo({
      NEXT_PUBLIC_APP_URL: 'https://preview.example.com',
    });
    const data = { name: '</script><script>alert(1)</script>' };
    const serialized = serializeJsonLd(data);

    expect(serialized).not.toContain('<');
    expect(serialized).toContain('\\u003c/script>');
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
