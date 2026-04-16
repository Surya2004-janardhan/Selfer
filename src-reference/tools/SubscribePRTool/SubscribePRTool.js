const TOOL_NAME = 'SubscribePRTool';

export const SubscribePRTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for PR subscriptions.';
  },
  async prompt() {
    return 'SubscribePRTool is unavailable in this npm migration build.';
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

export default SubscribePRTool;
