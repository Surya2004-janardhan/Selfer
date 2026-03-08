import { isVoiceCompatibleAudio } from "../../media/audio.js";
import { mediaKindFromMime } from "../../media/constants.js";
import { getImageMetadata, resizeToJpeg } from "../../media/image-ops.js";
import { detectMime } from "../../media/mime.js";
import type { PluginRuntime } from "./types.js";

export function createRuntimeMedia(): PluginRuntime["media"] {
  return {
    loadWebMedia: async () => {
      throw new Error("Web media loading is not supported in this version of Selfer.");
    },
    detectMime,
    mediaKindFromMime,
    isVoiceCompatibleAudio,
    getImageMetadata,
    resizeToJpeg,
  };
}
