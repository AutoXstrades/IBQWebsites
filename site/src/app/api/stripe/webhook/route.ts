import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST(request:Request){
  const stripe=getStripe(),secret=process.env.STRIPE_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");if(!stripe||!secret||!signature)return new Response("Webhook is not configured",{status:400});
  let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,secret);}catch{return new Response("Invalid signature",{status:400});}
  if(event.type==="checkout.session.completed"){
    const checkout=event.data.object;const ticketId=checkout.metadata?.ticketId,type=checkout.metadata?.paymentType;if(ticketId&&type){
      await prisma.payment.updateMany({where:{stripeSessionId:checkout.id},data:{status:"PAID"}});
      if(type==="AI_QUOTE"){const now=new Date();await prisma.ticket.update({where:{id:ticketId},data:{status:"AI_ACTIVE",aiChatStartedAt:now,aiChatExpiresAt:new Date(now.getTime()+5*60*1000)}});}else{const nextStep=Number(checkout.metadata?.nextStep||1);await prisma.ticket.update({where:{id:ticketId},data:{step:nextStep,status:checkout.metadata?.nextStatus||"OPEN"}});}
    }
  }
  return Response.json({received:true});
}
