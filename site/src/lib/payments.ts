import type Stripe from "stripe";
import { serial, SafeError } from "@/lib/security";
import { isFixedService, packageCents } from "@/lib/stripe";

export function entitled(ticket: { package: string; status: string; quotedPrice: number | null; payments: { type: string; status: string; amount: number }[] }) {
  if (["PAYMENT_REVIEW", "STOPPED"].includes(ticket.status)) return false;
  const total = ticket.quotedPrice || packageCents[ticket.package];
  if (!total) return false;
  const types = isFixedService(ticket.package) ? ["FULL"] : ["DEPOSIT", "BUILD", "LAUNCH"];
  return types.every(type => ticket.payments.some(p => p.type === type && p.status === "PAID")) && ticket.payments.filter(p => p.status === "PAID" && types.includes(p.type)).reduce((sum, p) => sum + p.amount, 0) >= total;
}
const transitions: Record<string, { from: number; to: number; status: string }> = {
  FULL: { from: 1, to: 2, status: "PAID" }, DEPOSIT: { from: 1, to: 2, status: "DEPOSIT_PAID" }, BUILD: { from: 4, to: 5, status: "IN_PROGRESS" }, LAUNCH: { from: 6, to: 7, status: "LAUNCHED" },
};
export async function fulfillCheckout(checkout: Stripe.Checkout.Session, eventId: string, eventType: string) {
  if (checkout.payment_status !== "paid") return;
  await serial(async tx => {
    if (await tx.stripeEvent.findUnique({ where: { id: eventId } })) return;
    const payment = await tx.payment.findUnique({ where: { stripeSessionId: checkout.id }, include: { ticket: true } });
    if (!payment) throw new SafeError("Payment record is not ready.", 409);
    if (checkout.metadata?.paymentId !== payment.id || checkout.metadata?.ticketId !== payment.ticketId || checkout.metadata?.paymentType !== payment.type || checkout.amount_total !== payment.amount || checkout.currency !== payment.currency || checkout.mode !== "payment") throw new SafeError("Payment does not match the order.", 400);
    await tx.stripeEvent.create({ data: { id: eventId, type: eventType } });
    if (payment.status !== "PENDING") return;
    const intent = typeof checkout.payment_intent === "string" ? checkout.payment_intent : checkout.payment_intent?.id;
    if (!intent) throw new SafeError("Payment intent missing.", 400);
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: intent } });
    const ticket = payment.ticket;
    if (["STOPPED", "PAYMENT_REVIEW"].includes(ticket.status)) return;
    if (payment.type === "AI_QUOTE") {
      if (!ticket.aiChatStartedAt) { const now = new Date(); await tx.ticket.update({ where: { id: ticket.id }, data: { status: "AI_ACTIVE", aiChatStartedAt: now, aiChatExpiresAt: new Date(now.getTime() + 300000) } }); }
    } else {
      const change = transitions[payment.type];
      if (change && ticket.step === change.from && (payment.type !== "BUILD" || ticket.status === "APPROVED")) await tx.ticket.update({ where: { id: ticket.id }, data: { step: change.to, status: change.status } });
    }
    await tx.auditEvent.create({ data: { actorId: "stripe", action: "PAYMENT_SETTLED", ticketId: ticket.id, details: JSON.stringify({ paymentId: payment.id, amount: payment.amount, eventId }) } });
  });
}
export async function reviewPayment(intent: string, eventId: string, eventType: string, status: "REFUNDED" | "DISPUTED") {
  await serial(async tx => {
    if (await tx.stripeEvent.findUnique({ where: { id: eventId } })) return;
    const payment = await tx.payment.findUnique({ where: { stripePaymentIntentId: intent } });
    if (!payment) throw new SafeError("Payment record is not ready.", 409);
    await tx.stripeEvent.create({ data: { id: eventId, type: eventType } });
    await tx.payment.update({ where: { id: payment.id }, data: { status } });
    await tx.ticket.update({ where: { id: payment.ticketId }, data: { status: "PAYMENT_REVIEW" } });
    await tx.auditEvent.create({ data: { actorId: "stripe", action: status, ticketId: payment.ticketId, details: JSON.stringify({ paymentId: payment.id, eventId }) } });
  });
}
