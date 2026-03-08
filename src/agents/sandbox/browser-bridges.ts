export const BROWSER_BRIDGES = new Map<
  string,
  {
    bridge: any;
    containerName: string;
    authToken?: string;
    authPassword?: string;
  }
>();
