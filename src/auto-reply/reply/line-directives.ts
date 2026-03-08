import type { ReplyPayload } from "../types.js";

/**
 * Parse LINE-specific directives from text and extract them into ReplyPayload fields.
 * (Stubbed: LINE channel is disabled)
 */
export function parseLineDirectives(payload: ReplyPayload): ReplyPayload {
  return payload;
}

/**
 * Check if text contains any LINE directives
 */
export function hasLineDirectives(_text: string): boolean {
  return false;
}
