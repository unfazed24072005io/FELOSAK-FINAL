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
  return d.toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-EG", {
    day: "2-digit",
    month: "short",
  });
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}
