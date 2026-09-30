import { env } from '@/lib/env'
import nodemailer from 'nodemailer'

type Email = { to: string; subject: string; text: string; html: string }

// Email can be sent in production only when SMTP_URL is set. In development
// without it, emails are printed to the server console instead.
export function isEmailConfigured() {
  return !!env.SMTP_URL || process.env.NODE_ENV !== 'production'
}

// "Split Karega <address>", from EMAIL_FROM or the SMTP login.
function fromAddress(smtpUrl: string) {
  if (env.EMAIL_FROM) return env.EMAIL_FROM
  const user = decodeURIComponent(new URL(smtpUrl).username)
  return `Split Karega <${user}>`
}

export async function sendEmail(email: Email) {
  if (!env.SMTP_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_URL is not set: cannot send email')
    }
    console.info(
      `[email] SMTP_URL not set, not sending. To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`,
    )
    return
  }
  const transport = nodemailer.createTransport(env.SMTP_URL)
  await transport.sendMail({ from: fromAddress(env.SMTP_URL), ...email })
}
