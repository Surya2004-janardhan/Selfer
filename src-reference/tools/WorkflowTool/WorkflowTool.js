import { WORKFLOW_TOOL_NAME } from './constants.js';

export const WorkflowTool = {
  name: WORKFLOW_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for workflow execution.';
  },
  async prompt() {
    return 'WorkflowTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return false;
  },
  async call() {
    return { data: { unavailable: true, tool: WORKFLOW_TOOL_NAME } };
  },
};

export default WorkflowTool;
