export const OVERFLOW_TEST_TOOL_NAME = 'OverflowTestTool';

export const OverflowTestTool = {
  name: OVERFLOW_TEST_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for overflow testing.';
  },
  async prompt() {
    return 'OverflowTestTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { unavailable: true, tool: OVERFLOW_TEST_TOOL_NAME } };
  },
};

export default OverflowTestTool;
