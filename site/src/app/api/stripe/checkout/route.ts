import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isFixedService, packageCents, paymentFor } from "@/lib/stripe";
import { apiError, jsonBody, limit, sameOrigin, SafeError, serial } from "@/lib/security";
import { packageSchema, ticketIdSchema } from "@/lib/validation";
const schema = z.discriminatedUnion("kind", [z.object({kind:z.literal("AI_QUOTE"),package:packageSchema}),z.object({kind:z.literal("INSTALLMENT"),ticketId:ticketIdSchema})]);
export async function POST(request: Request) {
  const session = await auth(); if (!session?.user?.id) return Response.json({error:"Sign in before checkout."},{status:401});
  try {
    sameOrigin(request);
    const stripe = getStripe(); if (!stripe) throw new SafeError("Payments are not enabled yet.",503);
    const parsed=schema.safeParse(await jsonBody(request)); if(!parsed.success)throw new SafeError("Invalid checkout.");
    await limit([{scope:"checkout",subject:session.user.id,max:10,seconds:3600}]);
    const body=parsed.data;
    const ticket=await serial(async tx=>{
      if(body.kind==="INSTALLMENT") {
        const found=await tx.ticket.findFirst({where:{id:body.ticketId,userId:session.user.id}}); if(!found)throw new SafeError("Ticket not found.",404); return found;
      }
      const pending=await tx.ticket.findFirst({where:{userId:session.user.id,quoteType:"AI",status:"AWAITING_AI",package:body.package}});
      if(pending)return pending;
      if(await tx.ticket.count({where:{userId:session.user.id}})>=25)throw new SafeError("Contact IBQ before opening more projects.",429);
      return tx.ticket.create({data:{userId:session.user.id,quoteType:"AI",package:body.package,businessName:"AI quote in progress",ownerName:session.user.name||"Customer",email:session.user.email,status:"AWAITING_AI"}});
    });
    const fixed=isFixedService(ticket.package);
    if(["STOPPED","PAYMENT_REVIEW"].includes(ticket.status))throw new SafeError("This project needs IBQ review.",409);
    if(body.kind==="INSTALLMENT" && (fixed ? ticket.step!==1 : ![1,4,6].includes(ticket.step)))throw new SafeError("No payment is due at this step.");
    if(body.kind==="INSTALLMENT" && ticket.package==="custom"&&!ticket.quotedPrice)throw new SafeError("Your custom price must be quoted first.");
    if(body.kind==="INSTALLMENT" && ticket.step===4&&ticket.status!=="APPROVED")throw new SafeError("Confirm your prototype first.");
    const total=ticket.quotedPrice||packageCents[ticket.package];
    const due=body.kind==="AI_QUOTE"?{type:"AI_QUOTE",label:"Five-minute guided quote",amount:500}:paymentFor(ticket.package,ticket.step,total);
    if(!due)throw new SafeError("No payment is due.");
    const key=ticket.id+":"+due.type;
    const payment=await serial(async tx=>{
      const previous=await tx.payment.findUnique({where:{checkoutKey:key}});
      if(previous) {
        if(previous.status!=="PENDING")throw new SafeError("This payment has already been processed.",409);
        if(previous.amount!==due.amount)throw new SafeError("Your quote changed. Contact IBQ.",409);
        return previous;
      }
      if(await tx.payment.count({where:{ticketId:ticket.id,status:"PENDING"}})>=3)throw new SafeError("Too many pending payments.",429);
      return tx.payment.create({data:{ticketId:ticket.id,type:due.type,amount:due.amount,currency:"usd",checkoutKey:key,expectedStep:ticket.step,expiresAt:new Date(Date.now()+1800000)}});
    });
    if(payment.stripeSessionId){
      const existing=await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
      if(existing.status==="open"&&existing.url)return Response.json({url:existing.url});
      if(existing.status==="expired") {
        await serial(async tx=>{await tx.payment.updateMany({where:{id:payment.id,status:"PENDING"},data:{status:"EXPIRED",checkoutKey:null}});});
        throw new SafeError("Checkout expired. You can start a fresh checkout now.",409);
      }
      throw new SafeError("Checkout completed or expired. Contact IBQ before trying another payment.",409);
    }
    const origin=new URL(process.env.NEXT_PUBLIC_APP_URL||request.url).origin;
    const checkout=await stripe.checkout.sessions.create({mode:"payment",payment_method_types:["card"],client_reference_id:payment.id,customer_email:session.user.email||undefined,
      expires_at:Math.floor(payment.expiresAt!.getTime()/1000),
      line_items:[{price_data:{currency:"usd",unit_amount:payment.amount,product_data:{name:"IBQ "+due.label}},quantity:1}],
      success_url:body.kind==="AI_QUOTE"?origin+"/quote/ai?ticket="+ticket.id:origin+"/account?payment=processing",cancel_url:origin+"/account",
      metadata:{paymentId:payment.id,ticketId:ticket.id,paymentType:payment.type}},
      {idempotencyKey:"ibq-checkout-"+payment.id});
    await prisma.payment.update({where:{id:payment.id},data:{stripeSessionId:checkout.id}});
    return Response.json({url:checkout.url});
  }catch(error){return apiError(error);}
}
