import { VERIFY_PLAN_EXECUTION_TOOL_NAME } from './constants.js';

export const VerifyPlanExecutionTool = {
  name: VERIFY_PLAN_EXECUTION_TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for plan verification.';
  },
  async prompt() {
    return 'VerifyPlanExecutionTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return {
      data: { unavailable: true, tool: VERIFY_PLAN_EXECUTION_TOOL_NAME },
    };
  },
};

export default VerifyPlanExecutionTool;
