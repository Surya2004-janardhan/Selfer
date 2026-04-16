const TOOL_NAME = 'CtxInspectTool';

export const CtxInspectTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for context inspection tooling.';
  },
  async prompt() {
    return 'CtxInspectTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { unavailable: true, tool: TOOL_NAME } };
  },
};

export default CtxInspectTool;
