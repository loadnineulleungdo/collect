export function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return Math.round(num).toLocaleString("ko-KR");
}

export function formatDecimal(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "0";
  return num.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "0.00%";
  return `${(num * 100).toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatUpdatedAt(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

export function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function normalizeSearchText(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}
