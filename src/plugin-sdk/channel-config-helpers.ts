export function formatTrimmedAllowFromEntries(allowFrom: Array<string | number>): string[] {
  return allowFrom.map((entry) => String(entry).trim()).filter(Boolean);
}
