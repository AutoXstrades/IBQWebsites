import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowed=new Set(["businessName","ownerName","phone","email","instagram","address","hours","logoUrl","tagline","pages","services","photos","cta","reviews","bookingTypes","availability","stripeScope","customScope","notes"]);
const requests=new Map<string,number[]>();
export async function POST(request:Request){
  const session=await auth();if(!session?.user?.id)return Response.json({error:"Unauthorized"},{status:401});const now=Date.now();const recent=(requests.get(session.user.id)||[]).filter(t=>now-t<60000);if(recent.length>=12)return Response.json({error:"Slow down for a moment."},{status:429});recent.push(now);requests.set(session.user.id,recent);
  const body=await request.json();const ticket=await prisma.ticket.findFirst({where:{id:String(body.ticketId),userId:session.user.id},include:{payments:true}});if(!ticket||ticket.quoteType!=="AI")return Response.json({error:"Ticket not found."},{status:404});if(!ticket.payments.some(p=>p.type==="AI_QUOTE"&&p.status==="PAID"))return Response.json({error:"Payment is still processing."},{status:402});
  if(!ticket.aiChatExpiresAt||ticket.aiChatExpiresAt.getTime()<=now)return Response.json({error:"This five-minute chat has ended.",locked:true},{status:423});
  if(body.confirm){await prisma.ticket.update({where:{id:ticket.id},data:{status:"OPEN",confirmedAt:new Date()}});return Response.json({ok:true,confirmed:true});}
  const answers=body.answers&&typeof body.answers==="object"?body.answers:{};const entries=Object.entries(answers).filter(([key,value])=>allowed.has(key)&&typeof value==="string"&&value.trim());if(!entries.length)return Response.json({error:"Add at least one answer."},{status:400});
  const transcript=JSON.parse(ticket.transcript||"[]") as unknown[];transcript.push({role:"user",answers:Object.fromEntries(entries),at:new Date().toISOString()});
  const updates:Record<string,string>={transcript:JSON.stringify(transcript),status:"AI_ACTIVE"};for(const [key,raw] of entries){const value=String(raw).trim();updates[key]=key==="pages"?JSON.stringify(value.split(",").map(x=>x.trim()).filter(Boolean)):value;}
  await prisma.ticket.update({where:{id:ticket.id},data:updates});
  return Response.json({ok:true,expiresAt:ticket.aiChatExpiresAt});
}
