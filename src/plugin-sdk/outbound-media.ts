import { loadWebMedia } from "../media/load.js";

export type OutboundMediaLoadOptions = {
  maxBytes?: number;
  mediaLocalRoots?: readonly string[];
};

export async function loadOutboundMediaFromUrl(
  mediaUrl: string,
  options: OutboundMediaLoadOptions = {},
) {
  return await loadWebMedia(mediaUrl, {
    maxBytes: options.maxBytes,
    localRoots: options.mediaLocalRoots,
  });
}
