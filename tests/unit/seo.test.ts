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
