export function formatRelative(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = date.getTime() - Date.now();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  if (min < 1) return past ? "nyss" : "om en stund";
  if (min < 60) return past ? `${min} min sedan` : `om ${min} min`;
  if (hr < 24) {
    if (past) return `${hr} h sedan`;
    return `om ${hr} h`;
  }
  if (day === 1) return past ? `Igår ${fmtTime(date)}` : `Imorgon ${fmtTime(date)}`;
  if (day < 7) return past ? `${day} dagar sedan` : `om ${day} dagar`;
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(n: string | number): string {
  if (typeof n === "string") return n;
  return n.toLocaleString("sv-SE");
}
