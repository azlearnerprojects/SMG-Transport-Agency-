/**
 * Conservative HTML escaping for CMS-managed content.
 *
 * The CMS stores plain text (with simple line breaks). Rather than rely on an
 * HTML allow-list, we escape everything and then re-introduce only safe
 * formatting (paragraphs and line breaks). This makes script injection
 * impossible by construction while still rendering readable content.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turn plain text into safe paragraph HTML (no user HTML is ever trusted). */
export function renderSafeRichText(input: string): string {
  return input
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
