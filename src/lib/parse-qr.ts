export interface ScanResult {
  on?: string;
  pc?: string;
  pm?: string;
  qty?: string;
  mc?: string;
  cc?: string;
  pdi?: string;
  hp?: string;
  [key: string]: string | undefined;
}

export function parseScanData(raw: string): ScanResult | null {
  try {
    let cleaned = raw.trim();
    if (/^[A-Za-z]\d+$/.test(cleaned)) return { pc: cleaned };
    if (cleaned.startsWith("{") && cleaned.endsWith("}")) cleaned = cleaned.slice(1, -1);
    const result: ScanResult = {};
    const pairs = cleaned.split(",");
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split(":");
      if (key) result[key.trim()] = (valueParts.length > 0 ? valueParts.join(":") : key).trim();
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

export function extractPartCode(raw: string): string {
  const trimmed = raw.trim();
  const parsed = parseScanData(trimmed);
  if (parsed?.pc) return parsed.pc;
  return trimmed;
}
