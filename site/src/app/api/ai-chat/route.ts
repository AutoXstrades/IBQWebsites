import { z } from "zod";
import { auth } from "@/auth";
import { ticketSchema } from "@/lib/validation";
import { apiError, jsonBody, limit, sameOrigin, serial, SafeError } from "@/lib/security";
const fields=ticketSchema.omit({package:true}).partial().extend({pages:z.string().max(500).optional()});
const schema=z.object({ticketId:z.string().max(100),confirm:z.boolean().optional(),answers:fields.optional()}).strict();
export async function POST(request:Request){
  const session=await auth();if(!session?.user?.id)return Response.json({error:"Unauthorized"},{status:401});
  try{
    sameOrigin(request);await limit([{scope:"ai-chat",subject:session.user.id,max:12,seconds:60}]);
    const parsed=schema.safeParse(await jsonBody(request));if(!parsed.success)throw new SafeError("Check the answer lengths and formats.");
    const body=parsed.data;
    const result=await serial(async tx=>{
      const ticket=await tx.ticket.findFirst({where:{id:body.ticketId,userId:session.user.id},include:{payments:true}});
      if(!ticket||ticket.quoteType!=="AI")throw new SafeError("Ticket not found.",404);
      if(!ticket.payments.some(p=>p.type==="AI_QUOTE"&&p.status==="PAID"&&p.amount===500)||ticket.status==="PAYMENT_REVIEW")throw new SafeError("Payment is required.",402);
      if(body.confirm){if(!ticket.aiChatStartedAt)throw new SafeError("Chat has not started.");await tx.ticket.update({where:{id:ticket.id},data:{status:"OPEN",confirmedAt:new Date()}});return {ok:true,confirmed:true};}
      if(ticket.confirmedAt||!ticket.aiChatExpiresAt||ticket.aiChatExpiresAt.getTime()<=Date.now())throw new SafeError("This chat is locked.",423);
      const entries=Object.entries(body.answers||{}).filter(([,v])=>typeof v==="string"&&v.trim());
      if(!entries.length)throw new SafeError("Add an answer.");
      const transcript=JSON.parse(ticket.transcript||"[]") as unknown[];
      if(transcript.length>=60)throw new SafeError("Chat message limit reached.",429);
      transcript.push({role:"user",answers:Object.fromEntries(entries),at:new Date().toISOString()});
      const updates:Record<string,string>={transcript:JSON.stringify(transcript),status:"AI_ACTIVE"};
      for(const [key,value] of entries)updates[key]=key==="pages"?JSON.stringify(String(value).split(",").slice(0,12).map(x=>x.trim())):String(value).trim();
      await tx.ticket.update({where:{id:ticket.id},data:updates});return {ok:true,expiresAt:ticket.aiChatExpiresAt};
    });return Response.json(result);
  }catch(error){return apiError(error);}
}
