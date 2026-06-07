import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("strips <script> blocks", () => {
    const input = 'hello<script>alert("xss")</script>world';
    expect(sanitizeHtml(input)).toBe("helloworld");
  });

  it("strips multiline <script> blocks", () => {
    const input = `before<script type="text/javascript">
      alert(1);
    </script>after`;
    expect(sanitizeHtml(input)).toBe("beforeafter");
  });

  it("strips <style> blocks", () => {
    const input =
      'hello<style>body{background:url("http://evil")}</style>world';
    expect(sanitizeHtml(input)).toBe("helloworld");
  });

  it("strips <iframe> tags", () => {
    expect(sanitizeHtml('<iframe src="evil"></iframe>')).toBe("");
    expect(sanitizeHtml('a<iframe src="x">b</iframe>c')).toBe("abc");
  });

  it("strips <object>, <embed>, <form> tags", () => {
    expect(sanitizeHtml("<object data=x></object>")).toBe("");
    expect(sanitizeHtml("<embed src=x>")).toBe("");
    expect(sanitizeHtml("<form action=x></form>")).toBe("");
    expect(sanitizeHtml("<input name=x>")).toBe("");
  });

  it("strips on* event handler attributes (double-quoted)", () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(input)).not.toMatch(/onerror/);
    expect(sanitizeHtml(input)).toMatch(/<img src="x">/);
  });

  it("strips on* event handler attributes (single-quoted)", () => {
    const input = "<img src='x' onerror='alert(1)'>";
    expect(sanitizeHtml(input)).not.toMatch(/onerror/);
  });

  it("strips on* event handler attributes (unquoted)", () => {
    const input = "<img src=x onerror=alert(1)>";
    expect(sanitizeHtml(input)).not.toMatch(/onerror/);
  });

  it("replaces javascript: URLs in href with #", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toMatch(
      /href="#"/,
    );
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(
      /javascript:/i,
    );
  });

  it("replaces javascript: URLs in src with #", () => {
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).toMatch(/src="#"/);
  });

  it("replaces javascript: URLs (single-quoted)", () => {
    expect(sanitizeHtml("<a href='javascript:alert(1)'>x</a>")).toMatch(
      /href='#'/,
    );
  });

  it("replaces javascript: URLs (unquoted)", () => {
    expect(sanitizeHtml("<a href=javascript:alert(1)>x</a>")).toMatch(
      /href="#"/,
    );
  });

  it("preserves safe wysiwyg HTML (<b>, <i>, <u>, <p>, <br>)", () => {
    const safe = "<b>bold</b> <i>italic</i> <u>under</u> <p>para</p><br>";
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it("preserves safe <a> links with http(s) hrefs", () => {
    const safe = '<a href="https://example.com">link</a>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it("preserves font tags and color attributes from the wysiwyg", () => {
    const safe = '<font color="#ff0000">red</font>';
    expect(sanitizeHtml(safe)).toBe(safe);
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
    expect(sanitizeHtml(42 as unknown as string)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
