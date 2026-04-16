const TOOL_NAME = 'REPLTool';

export const REPLTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for REPL tool.';
  },
  async prompt() {
    return 'REPLTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return false;
  },
  async call() {
    return { data: { unavailable: true, tool: TOOL_NAME } };
  },
};

export default REPLTool;
