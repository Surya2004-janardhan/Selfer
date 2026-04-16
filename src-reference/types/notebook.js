export const NotebookCellType = Object.freeze({
  CODE: "code",
  MARKDOWN: "markdown",
  RAW: "raw",
});

export function isNotebookCellType(value) {
  return value === "code" || value === "markdown" || value === "raw";
}

export const NotebookCellSource = Object.freeze({
  kind: "NotebookCellSource",
});

export const NotebookCellOutput = Object.freeze({
  kind: "NotebookCellOutput",
});

export const NotebookOutputImage = Object.freeze({
  kind: "NotebookOutputImage",
});

export const NotebookCellSourceOutput = Object.freeze({
  kind: "NotebookCellSourceOutput",
});

export const NotebookCell = Object.freeze({
  kind: "NotebookCell",
  required: ["cell_type", "source"],
});

export const NotebookContent = Object.freeze({
  kind: "NotebookContent",
  required: ["cells"],
});

export default NotebookContent;
