const TOOL_NAME = 'SleepTool';

export const SleepTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for sleep scheduling.';
  },
  async prompt() {
    return 'SleepTool is unavailable in this npm migration build.';
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

export default SleepTool;
