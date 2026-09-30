// Emails use inline styles only: email clients ignore stylesheets.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// The Split Karega header and page around an email's HTML body.
export function emailLayout(body: string) {
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111827;line-height:1.5">
<p style="font-size:20px;font-weight:700;margin:0 0 24px">Split <span style="color:#047857">Karega</span></p>
${body}
</div>`
}

// A green button; `href` and `label` must already be escaped.
export function emailButton(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${label}</a></p>`
}
