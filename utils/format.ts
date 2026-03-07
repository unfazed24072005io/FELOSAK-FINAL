export function formatEGP(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "-" : ""}${formatted} ج.م`;
}

export function formatEGPShort(amount: number): string {
  const abs = Math.abs(amount);
  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(1) + "M";
  } else if (abs >= 1_000) {
    formatted = (abs / 1_000).toFixed(1) + "K";
  } else {
    formatted = abs.toLocaleString("en-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return `${amount < 0 ? "-" : ""}${formatted} ج.م`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
  });
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizeAmountInput(raw: string): string {
  let s = raw;
  s = s.replace(/[٠-٩]/g, (ch) => ARABIC_DIGITS[ch] || ch);
  s = s.replace(/٫/g, ".");
  s = s.replace(/،/g, ",");
  const parts = s.split(".");
  if (parts.length <= 2) {
    s = parts.map((p) => p.replace(/,/g, "")).join(".");
  } else {
    s = s.replace(/,/g, "");
  }
  return s;
}

export function parseAmount(raw: string): number | null {
  const normalized = normalizeAmountInput(raw);
  if (!normalized || normalized.trim() === "") return null;
  const num = parseFloat(normalized);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100;
}

export function isValidDateStr(dateStr: string): boolean {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}
