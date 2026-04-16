export const QueueOperation = Object.freeze({
  ENQUEUE: "enqueue",
  DEQUEUE: "dequeue",
  CLEAR: "clear",
});

export const QueueOperationMessage = Object.freeze({
  kind: "queue-operation",
  fields: ["type", "operation", "timestamp", "sessionId"],
});

export function isQueueOperation(value) {
  return value === "enqueue" || value === "dequeue" || value === "clear";
}

export default QueueOperation;
