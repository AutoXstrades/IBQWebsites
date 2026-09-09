"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { entitled } from "@/lib/payments";
import { isFixedService, packageCents, paymentFor } from "@/lib/stripe";
import { httpsUrl } from "@/lib/validation";
import { serial, SafeError, limit } from "@/lib/security";
function refresh(){revalidatePath("/admin");revalidatePath("/account");}
export async function setProjectStep(form:FormData){
  const session=await requireAdmin(true);
  const p=z.object({ticketId:z.string().max(100),step:z.coerce.number().int().min(1).max(7),quotedPrice:z.string().max(20)}).safeParse(Object.fromEntries(form));if(!p.success)return;
  const quoted=p.data.quotedPrice.trim()?Math.round(Number(p.data.quotedPrice)*100):undefined;
  if(quoted!==undefined&&(!Number.isSafeInteger(quoted)||quoted<100||quoted>10000000))return;
  await serial(async tx=>{
    const ticket=await tx.ticket.findUnique({where:{id:p.data.ticketId},include:{payments:true}});if(!ticket)return;
    if(quoted!==undefined&&quoted!==ticket.quotedPrice&&ticket.payments.length)throw new SafeError("Cancel/reconcile existing payments before changing the quote.");
    const fixed=isFixedService(ticket.package);
    if(fixed&&p.data.step>4)return;
    if(p.data.step<ticket.step)throw new SafeError("Use a reviewed recovery procedure to move a project backward.");
    if(p.data.step>1&&!ticket.payments.some(p=>p.status==="PAID"&&p.type===(fixed?"FULL":"DEPOSIT")))throw new SafeError("A deposit or full payment is required.");
    if(!fixed&&p.data.step>=5&&!ticket.payments.some(p=>p.type==="BUILD"&&p.status==="PAID"))throw new SafeError("Build payment is required.");
    if((fixed&&p.data.step===4||!fixed&&p.data.step===7)&&!entitled(ticket))throw new SafeError("Full settlement is required to finish.");
    await tx.ticket.update({where:{id:ticket.id},data:{step:p.data.step,...(quoted?{quotedPrice:quoted}:{})}});
    await tx.auditEvent.create({data:{actorId:session.user.id,action:"PROJECT_UPDATED",ticketId:ticket.id,details:JSON.stringify({oldStep:ticket.step,newStep:p.data.step,oldQuote:ticket.quotedPrice,newQuote:quoted})}});
  });refresh();
}
export async function attachProjectAssets(form:FormData){
  const session=await requireAdmin(true);const id=String(form.get("ticketId")||"");if(id.length>100)return;
  const image=String(form.get("imageUrl")||"").trim(),preview=String(form.get("previewUrl")||"").trim();
  if(image&&!httpsUrl.safeParse(image).success||preview&&!httpsUrl.safeParse(preview).success)return;
  await serial(async tx=>{
    if(image)await tx.prototypeImage.create({data:{ticketId:id,url:image}});
    if(preview)await tx.ticket.update({where:{id},data:{previewUrl:preview}});
    await tx.auditEvent.create({data:{actorId:session.user.id,action:"ASSETS_ATTACHED",ticketId:id,details:JSON.stringify({image:Boolean(image),preview:Boolean(preview)})}});
  });refresh();
}
export async function markPayment(form:FormData){
  const session=await requireAdmin(true);
  await limit([{scope:"manual-payment",subject:session.user.id,max:20,seconds:3600}]);
  const p=z.object({ticketId:z.string().max(100),type:z.enum(["FULL","DEPOSIT","BUILD","LAUNCH"]),amount:z.coerce.number().positive().max(100000),reason:z.string().trim().min(8).max(300),receipt:z.string().trim().min(3).max(100),confirmed:z.literal("yes")}).safeParse(Object.fromEntries(form));
  if(!p.success)return;
  await serial(async tx=>{
    const ticket=await tx.ticket.findUnique({where:{id:p.data.ticketId},include:{payments:true}});if(!ticket)return;
    if(["STOPPED","PAYMENT_REVIEW"].includes(ticket.status))throw new SafeError("Resolve the project review first.");
    if(ticket.package==="custom"&&!ticket.quotedPrice)return;
    if(ticket.step===4&&ticket.status!=="APPROVED")return;
    if(!isFixedService(ticket.package)&&![1,4,6].includes(ticket.step))return;
    const due=paymentFor(ticket.package,ticket.step,ticket.quotedPrice||packageCents[ticket.package]);
    const amount=Math.round(p.data.amount*100);
    if(!due||due.type!==p.data.type||due.amount!==amount)throw new SafeError("Record the exact installment due.");
    if(ticket.payments.some(p=>p.type===due.type&&["PAID","PENDING"].includes(p.status)))throw new SafeError("Reconcile the existing payment first.");
    const payment=await tx.payment.create({data:{ticketId:ticket.id,type:due.type,amount,status:"PAID",paidAt:new Date(),checkoutKey:ticket.id+":"+due.type}});
    const status=due.type==="FULL"?"PAID":due.type==="DEPOSIT"?"DEPOSIT_PAID":due.type==="BUILD"?"IN_PROGRESS":"LAUNCHED";
    await tx.ticket.update({where:{id:ticket.id},data:{step:due.nextStep,status}});
    await tx.auditEvent.create({data:{actorId:session.user.id,action:"MANUAL_PAYMENT",ticketId:ticket.id,details:JSON.stringify({paymentId:payment.id,amount,type:due.type,reason:p.data.reason,receipt:p.data.receipt,oldStep:ticket.step,newStep:due.nextStep})}});
  });refresh();
}
export async function revokeUserSessions(form:FormData){
  const session=await requireAdmin(true);const id=String(form.get("userId")||"");if(!id||id.length>100)return;
  await serial(async tx=>{await tx.user.update({where:{id},data:{sessionVersion:{increment:1}}});await tx.auditEvent.create({data:{actorId:session.user.id,action:"SESSIONS_REVOKED",details:JSON.stringify({userId:id})}});});refresh();
}
