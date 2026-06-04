export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number
  align?: "left" | "right"
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function timestamp() {
  return new Date().toISOString().slice(0, 10)
}

// CSV com delimitador ; e BOM UTF-8 — abre direto no Excel pt-BR
export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "")
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = columns.map((c) => esc(c.header)).join(";")
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(";")).join("\r\n")
  const csv = "﻿" + head + "\r\n" + body
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  triggerDownload(blob, `${filename}-${timestamp()}.csv`)
}

// PDF via janela de impressão do navegador (Salvar como PDF) — zero dependência
export function exportPdf<T>(
  title: string,
  subtitle: string,
  columns: ExportColumn<T>[],
  rows: T[],
) {
  const esc = (v: unknown) =>
    String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))

  const thead = columns
    .map((c) => `<th style="text-align:${c.align ?? "left"}">${esc(c.header)}</th>`)
    .join("")
  const tbody = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td style="text-align:${c.align ?? "left"}">${esc(c.value(r))}</td>`)
          .join("")}</tr>`,
    )
    .join("")

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:32px;font-size:12px}
  header{margin-bottom:18px;border-bottom:2px solid #4f46e5;padding-bottom:10px}
  h1{font-size:18px;margin:0 0 2px}
  .sub{color:#666;font-size:11px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f3f4f6;text-transform:uppercase;font-size:9px;letter-spacing:.4px;color:#555;padding:7px 9px;border-bottom:2px solid #ddd}
  td{padding:6px 9px;border-bottom:1px solid #eee;font-size:11px}
  tr:nth-child(even) td{background:#fafafa}
  footer{margin-top:18px;color:#999;font-size:9px;text-align:right}
</style></head><body>
<header><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div></header>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
<footer>wiqfy · Gerado em ${new Date().toLocaleString("pt-BR")}</footer>
<script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open("", "_blank")
  if (!w) {
    alert("Permita pop-ups para exportar o PDF.")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
