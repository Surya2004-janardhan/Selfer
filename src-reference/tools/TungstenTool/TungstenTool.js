const TOOL_NAME = 'TungstenTool';

export const TungstenTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for tungsten terminal integration.';
  },
  async prompt() {
    return 'TungstenTool is unavailable in this npm migration build.';
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

export default TungstenTool;
