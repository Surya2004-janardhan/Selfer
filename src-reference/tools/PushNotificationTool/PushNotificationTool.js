const TOOL_NAME = 'PushNotificationTool';

export const PushNotificationTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for push notifications.';
  },
  async prompt() {
    return 'PushNotificationTool is unavailable in this npm migration build.';
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

export default PushNotificationTool;
