import { TERMINAL_CAPTURE_TOOL_NAME } from './prompt.js';

export const TerminalCaptureTool = {
  name: TERMINAL_CAPTURE_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for terminal capture.';
  },
  async prompt() {
    return 'TerminalCaptureTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { unavailable: true, tool: TERMINAL_CAPTURE_TOOL_NAME } };
  },
};

export default TerminalCaptureTool;
