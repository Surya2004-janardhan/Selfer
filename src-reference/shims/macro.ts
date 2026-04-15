export const MACRO = {
  VERSION: process.env.SELFER_VERSION || '0.0.0-node-migration',
  BUILD_TIME: process.env.SELFER_BUILD_TIME || new Date().toISOString(),
  FEEDBACK_CHANNEL: process.env.SELFER_FEEDBACK_CHANNEL || 'https://github.com/Surya2004-janardhan/Selfer/issues',
  ISSUES_EXPLAINER: process.env.SELFER_ISSUES_EXPLAINER || 'https://github.com/Surya2004-janardhan/Selfer/issues',
  PACKAGE_URL: process.env.SELFER_PACKAGE_URL || '@selfer/cli',
  NATIVE_PACKAGE_URL: process.env.SELFER_NATIVE_PACKAGE_URL || '@selfer/native',
  VERSION_CHANGELOG: process.env.SELFER_VERSION_CHANGELOG || ''
};
