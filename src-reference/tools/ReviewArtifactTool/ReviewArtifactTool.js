const TOOL_NAME = 'ReviewArtifactTool';

export const ReviewArtifactTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for artifact review.';
  },
  async prompt() {
    return 'ReviewArtifactTool is unavailable in this npm migration build.';
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

export default ReviewArtifactTool;
