export function feature(name: string): boolean {
  const envKey = `FEATURE_${name}`.toUpperCase();
  const raw = process.env[envKey];
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'on';
}
