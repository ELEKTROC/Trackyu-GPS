/**
 * Basic HTML sanitizer to prevent XSS attacks.
 * Strips all tags except a safe whitelist and removes dangerous attributes.
 * Use this instead of dangerouslySetInnerHTML with raw user content.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'a',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'hr', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'sub', 'sup', 'mark'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
  'class', 'id', 'style', 'colspan', 'rowspan'
]);

const DANGEROUS_ATTR_PATTERN = /^on|javascript:|data:/i;
const DANGEROUS_STYLE_PATTERN = /expression\s*\(|url\s*\(.*javascript/i;

/**
 * Sanitize HTML string by removing dangerous tags and attributes.
 * @param html Raw HTML string
 * @returns Sanitized HTML string safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Remove script, style, iframe, object, embed, form, input tags entirely (including content)
  let sanitized = html.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|applet|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Also remove self-closing versions
  sanitized = sanitized.replace(/<(script|style|iframe|object|embed|form|input|textarea|select|button|applet|meta|link|base)[^>]*\/?>/gi, '');

  // Process remaining tags - strip disallowed tags but keep content, sanitize attributes on allowed tags
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tagName, attrs) => {
    const tag = tagName.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!ALLOWED_TAGS.has(tag)) {
      return ''; // Strip the tag but keep surrounding text
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    // Sanitize attributes
    const cleanAttrs: string[] = [];
    const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Skip dangerous attributes
      if (!ALLOWED_ATTRS.has(attrName)) continue;
      if (DANGEROUS_ATTR_PATTERN.test(attrValue)) continue;
      if (attrName === 'style' && DANGEROUS_STYLE_PATTERN.test(attrValue)) continue;

      // Force safe link attributes
      if (attrName === 'href' && tag === 'a') {
        if (!/^(https?:|mailto:|tel:|#)/i.test(attrValue.trim())) continue;
        cleanAttrs.push(`href="${attrValue}"`);
        cleanAttrs.push('rel="noopener noreferrer"');
        continue;
      }

      cleanAttrs.push(`${attrName}="${attrValue}"`);
    }

    const attrStr = cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : '';
    const selfClosing = ['br', 'hr', 'img'].includes(tag) ? ' /' : '';
    return `<${tag}${attrStr}${selfClosing}>`;
  });

  return sanitized;
}
