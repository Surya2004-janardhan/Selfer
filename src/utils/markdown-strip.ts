/**
 * Extremely basic markdown stripper for TTS and other plaintext-only use cases.
 */
export function stripMarkdown(text: string): string {
  if (!text) {
    return "";
  }
  return text
    .replace(/#+\s+/g, "") // Headers
    .replace(/[*_~`]{1,3}/g, "") // Bold, italic, strikethrough, code
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "") // Images
    .replace(/>\s+/g, "") // Blockquotes
    .replace(/^[*-+]\s+/gm, "") // List items
    .replace(/^\d+\.\s+/gm, "") // Numbered list items
    .trim();
}
