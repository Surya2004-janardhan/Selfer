import { SEND_USER_FILE_TOOL_NAME } from './prompt.js';

export const SendUserFileTool = {
  name: SEND_USER_FILE_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for sending files to the user.';
  },
  async prompt() {
    return 'SendUserFileTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { unavailable: true, tool: SEND_USER_FILE_TOOL_NAME } };
  },
};

export default SendUserFileTool;
