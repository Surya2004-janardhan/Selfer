const TOOL_NAME = 'WebBrowserTool';

export const WebBrowserTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for web browser automation.';
  },
  async prompt() {
    return 'WebBrowserTool is unavailable in this npm migration build.';
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

export default WebBrowserTool;
