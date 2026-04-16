let initialized = false;

export function initBundledWorkflows() {
  initialized = true;
  return initialized;
}

export function areBundledWorkflowsInitialized() {
  return initialized;
}

export default {
  initBundledWorkflows,
  areBundledWorkflowsInitialized,
};
