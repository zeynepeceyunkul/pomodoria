/** Coerce API / storage values to boolean for native props (Fabric is strict). */
export function asBoolean(v: unknown, defaultValue = false): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === '') return false;
  }
  if (typeof v === 'number') return v !== 0;
  if (v == null) return defaultValue;
  return defaultValue;
}
