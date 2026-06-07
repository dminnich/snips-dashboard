export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(
      /<\/?(?:iframe|object|embed|link|meta|base|form|input|button|textarea|select)\b[^>]*>/gi,
      "",
    )
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*"\s*javascript:[^"]*"/gi,
      '$1="#"',
    )
    .replace(
      /(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*'\s*javascript:[^']*'/gi,
      "$1='#'",
    )
    .replace(
      /(\s(?:href|src|action|formaction|background|poster|cite|srcset|xlink:href))\s*=\s*javascript:[^\s>]*/gi,
      '$1="#"',
    );
}
