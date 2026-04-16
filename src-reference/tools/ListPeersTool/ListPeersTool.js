const TOOL_NAME = 'ListPeersTool';

export const ListPeersTool = {
  name: TOOL_NAME,
  async description() {
    return 'Compatibility placeholder for peer listing.';
  },
  async prompt() {
    return 'ListPeersTool is unavailable in this npm migration build.';
  },
  isEnabled() {
    return false;
  },
  isReadOnly() {
    return true;
  },
  async call() {
    return { data: { peers: [], unavailable: true } };
  },
};

export default ListPeersTool;
