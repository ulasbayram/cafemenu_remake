import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Small renderer for these controlled Markdown documents; no remote assets.
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function inline(value) {
  return escape(value)
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
function render(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++; continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i++].split("|").slice(1, -1).map((cell) => cell.trim());
        if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
        rows.push(cells);
      }
      const [head, ...body] = rows;
      blocks.push(`<div class="table-wrap"><table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      blocks.push(`<ul>${items.join("")}</ul>`); continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||- )/.test(lines[i])) {
      const current = lines[i++];
      paragraph.push(inline(current.trimEnd()) + (current.endsWith("  ") ? "<br>" : " "));
    }
    blocks.push(`<p>${paragraph.join("").trim()}</p>`);
  }
  return blocks.join("\n");
}
const css = `:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f7f7f2;color:#242b27;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.75}main{max-width:960px;margin:40px auto;padding:48px;background:#fff;border:1px solid #e2e7df;border-radius:16px}nav{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:32px;font-size:.95rem}a{color:#245b46;text-underline-offset:3px;overflow-wrap:anywhere}h1{font-size:2rem;line-height:1.25;letter-spacing:-.035em;margin:0 0 24px}h2{font-size:1.3rem;line-height:1.45;margin-top:36px}h3{font-size:1.08rem;margin-top:28px}p,li{overflow-wrap:anywhere}li+li{margin-top:10px}code{background:#f0f3ee;border-radius:4px;padding:2px 4px;font-size:.9em}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.92rem;line-height:1.6}th,td{padding:12px;vertical-align:top;border:1px solid #dce3da;text-align:left}th{background:#f0f3ee}footer{border-top:1px solid #e2e7df;margin-top:40px;padding-top:18px;color:#637166;font-size:.9rem}@media(max-width:640px){main{margin:0;padding:24px 18px;border:0;border-radius:0}h1{font-size:1.65rem}th,td{padding:8px}}@media print{body{background:#fff;font-size:10pt}main{margin:0;max-width:none;padding:0;border:0}nav{display:none}h2,h3{break-after:avoid}tr{break-inside:avoid}a{color:inherit}.table-wrap{overflow:visible}}`;
for (const language of ["tr", "en"]) {
 for (const name of ["terms-of-service", "privacy-policy"]) {
  const file = resolve("docs/legal", `${name}.${language}.md`);
  const source = readFileSync(file, "utf8");
  const title = source.split(/\r?\n/)[0].replace(/^# /, "");
  const other = name === "terms-of-service" ? "privacy-policy" : "terms-of-service";
  const otherLabel = language === "en"
    ? (other === "privacy-policy" ? "Privacy Policy" : "Terms of Service")
    : (other === "privacy-policy" ? "Gizlilik Politikası" : "Kullanım Koşulları");
  const navigationLabel = language === "en" ? "Legal pages" : "Yasal sayfalar";
  const updatedLabel = language === "en" ? "Last updated: 17 October 2026" : "Son güncelleme: 17 Ekim 2026";
  const html = `<!doctype html>\n<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Hibrit</title><style>${css}</style></head><body><main><nav aria-label="${navigationLabel}"><a href="https://fincan.hibrit.dev">Fincan</a><a href="${other}.${language}.html">${otherLabel}</a></nav>${render(source)}<footer>Fincan · Hibrit · ${updatedLabel}</footer></main></body></html>\n`;
  writeFileSync(file.replace(/\.md$/, ".html"), html, "utf8");
  console.log(`Generated docs/legal/${name}.${language}.html`);
 }
}
