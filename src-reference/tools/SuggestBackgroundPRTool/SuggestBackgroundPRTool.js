const TOOL_NAME = 'SuggestBackgroundPRTool';

export const SuggestBackgroundPRTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for background PR suggestions.';
  },
  async prompt() {
    return 'SuggestBackgroundPRTool is unavailable in this npm migration build.';
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

export default SuggestBackgroundPRTool;
