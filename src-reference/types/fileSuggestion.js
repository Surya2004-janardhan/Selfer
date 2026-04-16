/**
 * Runtime schema metadata for file suggestion command input.
 * Type users consume this via type-only imports in TS files.
 */
export const FileSuggestionCommandInput = Object.freeze({
  kind: "FileSuggestionCommandInput",
  required: ["session_id", "cwd", "query"],
});

export default FileSuggestionCommandInput;
