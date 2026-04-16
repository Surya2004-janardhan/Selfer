/**
 * Runtime guard for connector text blocks.
 *
 * Connector text arrives as an assistant content block with
 * type=connector_text and a connector_text payload.
 */
export function isConnectorTextBlock(value) {
  if (!value || typeof value !== "object") return false;
  const block = /** @type {{ type?: unknown; connector_text?: unknown }} */ (
    value
  );
  return (
    block.type === "connector_text" && typeof block.connector_text === "string"
  );
}
