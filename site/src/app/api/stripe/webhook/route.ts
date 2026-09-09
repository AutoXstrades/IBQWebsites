import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckout, reviewPayment } from "@/lib/payments";
import { apiError, readBody } from "@/lib/security";
export async function POST(request: Request) {
  const stripe = getStripe(), secret = process.env.STRIPE_WEBHOOK_SECRET, signature = request.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) return new Response("Webhook unavailable", { status: 400 });
  try {
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(Buffer.from(await readBody(request, 262144)), signature, secret); } catch { return new Response("Invalid signature", { status: 400 }); }
    if (event.livemode !== (process.env.PAYMENTS_MODE === "live")) return new Response("Payment mode mismatch", { status: 400 });
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") await fulfillCheckout(event.data.object, event.id, event.type);
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
      const object = event.data.object;
      const intent = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
      if (intent) await reviewPayment(intent, event.id, event.type, event.type === "charge.refunded" ? "REFUNDED" : "DISPUTED");
    }
    return Response.json({ received: true });
  } catch (error) { return apiError(error); }
}
