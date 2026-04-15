declare const MACRO: {
  VERSION: string;
  BUILD_TIME?: string;
  FEEDBACK_CHANNEL?: string;
  ISSUES_EXPLAINER?: string;
  PACKAGE_URL?: string;
  NATIVE_PACKAGE_URL?: string;
  VERSION_CHANGELOG?: string;
};

declare const Bun: any;

declare module '*' {
  const anything: any;
  export = anything;
}
