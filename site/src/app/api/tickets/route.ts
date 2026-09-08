import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify";
import { packageCents } from "@/lib/stripe";

const schema=z.object({
  package:z.enum(["starter","business","custom","proto-visual","proto-code","full-build","chatbot","logo"]),businessName:z.string().min(2),ownerName:z.string().min(2),phone:z.string().optional(),email:z.string().email().optional().or(z.literal("")),instagram:z.string().optional(),address:z.string().optional(),hours:z.string().optional(),logoUrl:z.string().optional(),tagline:z.string().optional(),pages:z.array(z.string()).optional(),services:z.string().optional(),photos:z.string().optional(),cta:z.string().optional(),reviews:z.string().optional(),bookingTypes:z.string().optional(),availability:z.string().optional(),stripeScope:z.string().optional(),customScope:z.string().optional(),notes:z.string().optional()
});
export async function POST(request:Request){
  const session=await auth(); if(!session?.user?.id)return Response.json({error:"Sign in to create your ticket."},{status:401});
  const parsed=schema.safeParse(await request.json()); if(!parsed.success)return Response.json({error:"Check the required fields and try again."},{status:400});
  const product=parsed.data.package==="business"?"full-build":parsed.data.package;
  const ticket=await prisma.ticket.create({data:{...parsed.data,package:product,quotedPrice:product==="custom"?null:packageCents[product],pages:JSON.stringify(parsed.data.pages||[]),userId:session.user.id,email:parsed.data.email||session.user.email}});
  await notifyAdmin(`New IBQ ${ticket.package} quote`,`${ticket.businessName} — ${ticket.ownerName}\nTicket ${ticket.id}\n${ticket.notes||"No notes"}`);
  return Response.json({ticket:{id:ticket.id}});
}
