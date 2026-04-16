import { SNIP_TOOL_NAME } from './prompt.js';

export const SnipTool = {
  name: SNIP_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for history snip operations.';
  },
  async prompt() {
    return 'SnipTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { unavailable: true, tool: SNIP_TOOL_NAME } };
  },
};

export default SnipTool;
