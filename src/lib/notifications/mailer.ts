import nodemailer, { type Transporter } from "nodemailer"
import { env } from "@/lib/env"

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport(env.smtpUrl)
  return transporter
}

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
  attachments?: { filename: string; content: string; contentType: string }[]
}

export async function sendMail(message: MailMessage): Promise<void> {
  await getTransporter().sendMail({ from: env.emailFrom, ...message })
}
