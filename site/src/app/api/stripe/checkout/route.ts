import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isFixedService, packageCents, paymentFor } from "@/lib/stripe";

export async function POST(request:Request){
  const session=await auth();if(!session?.user?.id)return Response.json({error:"Sign in before checkout."},{status:401});
  const body=await request.json();const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;const stripe=getStripe();
  if(!stripe && (process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_TEST_PAYMENTS !== "true")) return Response.json({error:"Payments are not configured yet. Please contact IBQ."},{status:503});
  if(body.kind==="AI_QUOTE"){
    const pkg=["starter","business","custom","full-build","proto-visual","proto-code","chatbot","logo"].includes(body.package)?body.package:"starter";
    const ticket=await prisma.ticket.create({data:{userId:session.user.id,quoteType:"AI",package:pkg,businessName:"AI quote in progress",ownerName:session.user.name||"Customer",email:session.user.email,status:"AWAITING_AI"}});
    if(!stripe){const now=new Date();await prisma.payment.create({data:{ticketId:ticket.id,type:"AI_QUOTE",amount:500,status:"PAID"}});await prisma.ticket.update({where:{id:ticket.id},data:{status:"AI_ACTIVE",aiChatStartedAt:now,aiChatExpiresAt:new Date(now.getTime()+5*60*1000)}});return Response.json({url:`${origin}/quote/ai?ticket=${ticket.id}&local=1`});}
    const checkout=await stripe.checkout.sessions.create({mode:"payment",customer_email:session.user.email||undefined,line_items:[{price_data:{currency:"usd",unit_amount:500,product_data:{name:"IBQ five-minute AI quote"}},quantity:1}],success_url:`${origin}/quote/ai?ticket=${ticket.id}&session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/quote?package=${pkg}`,metadata:{ticketId:ticket.id,paymentType:"AI_QUOTE"}});
    await prisma.payment.create({data:{ticketId:ticket.id,type:"AI_QUOTE",amount:500,stripeSessionId:checkout.id}});return Response.json({url:checkout.url});
  }
  if(body.kind==="INSTALLMENT"){
    const ticket=await prisma.ticket.findFirst({where:{id:String(body.ticketId),userId:session.user.id}});if(!ticket)return Response.json({error:"Ticket not found."},{status:404});
    const fixed=isFixedService(ticket.package);
    if(fixed?ticket.step!==1:![1,4,6].includes(ticket.step))return Response.json({error:"No payment is due at this step."},{status:400});
    if(ticket.package==="custom"&&!ticket.quotedPrice)return Response.json({error:"Your custom total must be quoted before a deposit is due."},{status:400});
    if(ticket.step===4&&ticket.status!=="APPROVED")return Response.json({error:"Confirm the prototype before paying the build installment."},{status:400});
    const total=ticket.quotedPrice||packageCents[ticket.package]||250000;const due=paymentFor(ticket.package,ticket.step,total);if(!due)return Response.json({error:"No payment is due at this step."},{status:400});const nextStatus=due.type==="FULL"?"PAID":due.type==="DEPOSIT"?"DEPOSIT_PAID":due.type==="BUILD"?"IN_PROGRESS":"LAUNCHED";
    if(!stripe){await prisma.payment.create({data:{ticketId:ticket.id,type:due.type,amount:due.amount,status:"PAID"}});await prisma.ticket.update({where:{id:ticket.id},data:{step:due.nextStep,status:nextStatus}});return Response.json({url:`${origin}/account?payment=local-test`});}
    const checkout=await stripe.checkout.sessions.create({mode:"payment",customer_email:session.user.email||undefined,line_items:[{price_data:{currency:"usd",unit_amount:due.amount,product_data:{name:`IBQ ${due.label}`}},quantity:1}],success_url:`${origin}/account?payment=success`,cancel_url:`${origin}/account`,metadata:{ticketId:ticket.id,paymentType:due.type,nextStep:String(due.nextStep),nextStatus}});
    await prisma.payment.create({data:{ticketId:ticket.id,type:due.type,amount:due.amount,stripeSessionId:checkout.id}});return Response.json({url:checkout.url});
  }
  return Response.json({error:"Unsupported checkout."},{status:400});
}
