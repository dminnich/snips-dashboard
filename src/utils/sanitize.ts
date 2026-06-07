import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "u",
      "font",
      "span",
      "div",
      "p",
      "br",
      "strong",
      "em",
      "a",
    ],
    ALLOWED_ATTR: ["size", "color", "style", "href"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}
