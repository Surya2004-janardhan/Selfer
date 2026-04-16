const TOOL_NAME = 'MonitorTool';

export const MonitorTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for monitor tooling.';
  },
  async prompt() {
    return 'MonitorTool is unavailable in this npm migration build.';
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

export default MonitorTool;
