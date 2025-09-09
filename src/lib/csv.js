export function toCSV(rows, headers) {
  // headers: [{key:'email', label:'Email'}, ...]
  const head = headers.map(h => h.label).join(",");
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename || "export.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
