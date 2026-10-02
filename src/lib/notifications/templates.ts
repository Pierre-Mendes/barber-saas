import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar/ics"
import { formatDateTime } from "@/lib/scheduling/time"

export interface BookingMessageContext {
  tenantName: string
  primaryColor: string
  timeZone: string
  customerName: string
  barberName: string
  serviceName: string
  price: string
  /** Política de cancelamento da barbearia, em uma frase. */
  cancellationText?: string
  address: string
  startsAt: Date
  manageUrl: string
  event: CalendarEvent
}

export interface EmailContent {
  subject: string
  html: string
  text: string
}

export interface PushContent {
  title: string
  body: string
  url: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function layout(ctx: BookingMessageContext, heading: string, intro: string, withCalendar: boolean): string {
  const when = formatDateTime(ctx.startsAt, ctx.timeZone)
  const button = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;border-radius:8px;background:${escapeHtml(ctx.primaryColor)};color:#fff;text-decoration:none;font-weight:600">${label}</a>`
  const calendarButtons = withCalendar
    ? `<p style="margin-top:24px">${button(googleCalendarUrl(ctx.event), "Google Agenda")}${button(outlookCalendarUrl(ctx.event), "Outlook")}</p>
       <p style="color:#666;font-size:13px">Usa Apple Calendar? Abra o arquivo <b>agendamento.ics</b> anexo.</p>`
    : ""
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 4px">${escapeHtml(ctx.tenantName)}</h2>
    <h3 style="margin:16px 0 8px">${escapeHtml(heading)}</h3>
    <p>${escapeHtml(intro)}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px">
      <tr><td style="color:#666;padding:4px 0">Serviço</td><td style="text-align:right">${escapeHtml(ctx.serviceName)}</td></tr>
      <tr><td style="color:#666;padding:4px 0">Profissional</td><td style="text-align:right">${escapeHtml(ctx.barberName)}</td></tr>
      <tr><td style="color:#666;padding:4px 0">Quando</td><td style="text-align:right">${escapeHtml(when)}</td></tr>
      <tr><td style="color:#666;padding:4px 0">Valor</td><td style="text-align:right">${escapeHtml(ctx.price)}</td></tr>
      <tr><td style="color:#666;padding:4px 0">Endereço</td><td style="text-align:right">${escapeHtml(ctx.address)}</td></tr>
    </table>
    ${calendarButtons}
    <p style="margin-top:24px"><a href="${escapeHtml(ctx.manageUrl)}">Ver ou cancelar agendamento</a></p>
    ${ctx.cancellationText ? `<p style="color:#666;font-size:13px">${escapeHtml(ctx.cancellationText)}</p>` : ""}
  </div></body></html>`
}

function plainText(ctx: BookingMessageContext, heading: string): string {
  return [
    `${ctx.tenantName} — ${heading}`,
    "",
    `Serviço: ${ctx.serviceName}`,
    `Profissional: ${ctx.barberName}`,
    `Quando: ${formatDateTime(ctx.startsAt, ctx.timeZone)}`,
    `Valor: ${ctx.price}`,
    `Endereço: ${ctx.address}`,
    "",
    `Gerenciar: ${ctx.manageUrl}`,
    ...(ctx.cancellationText ? [ctx.cancellationText] : []),
  ].join("\n")
}

export function bookingConfirmedEmail(ctx: BookingMessageContext): EmailContent {
  const heading = "Agendamento confirmado ✂️"
  return {
    subject: `Agendamento confirmado — ${ctx.tenantName}`,
    html: layout(ctx, heading, `Olá, ${ctx.customerName}! Seu horário está reservado.`, true),
    text: plainText(ctx, heading),
  }
}

export function bookingReminderEmail(ctx: BookingMessageContext): EmailContent {
  const heading = "Lembrete do seu horário"
  return {
    subject: `Lembrete: ${ctx.serviceName} em ${ctx.tenantName}`,
    html: layout(ctx, heading, `Olá, ${ctx.customerName}! Passando para lembrar do seu horário.`, true),
    text: plainText(ctx, heading),
  }
}

export function bookingCancelledEmail(ctx: BookingMessageContext): EmailContent {
  const heading = "Agendamento cancelado"
  return {
    subject: `Agendamento cancelado — ${ctx.tenantName}`,
    html: layout({ ...ctx, cancellationText: undefined }, heading, `Olá, ${ctx.customerName}. O agendamento abaixo foi cancelado.`, false),
    text: plainText({ ...ctx, cancellationText: undefined }, heading),
  }
}

export function staffNewBookingEmail(ctx: BookingMessageContext): EmailContent {
  const heading = "Novo agendamento na sua agenda"
  return {
    subject: `Novo agendamento: ${ctx.customerName} — ${formatDateTime(ctx.startsAt, ctx.timeZone, { dateStyle: "short" })}`,
    html: layout(ctx, heading, `${ctx.customerName} agendou com ${ctx.barberName}.`, true),
    text: plainText(ctx, heading),
  }
}

export function bookingPush(kind: "confirmed" | "reminder" | "cancelled", ctx: BookingMessageContext): PushContent {
  const when = formatDateTime(ctx.startsAt, ctx.timeZone, { dateStyle: "short", timeStyle: "short" })
  const titles = {
    confirmed: `Agendamento confirmado — ${ctx.tenantName}`,
    reminder: `Seu horário em ${ctx.tenantName} está chegando`,
    cancelled: `Agendamento cancelado — ${ctx.tenantName}`,
  }
  return {
    title: titles[kind],
    body: `${ctx.serviceName} com ${ctx.barberName} • ${when}`,
    url: ctx.manageUrl,
  }
}
