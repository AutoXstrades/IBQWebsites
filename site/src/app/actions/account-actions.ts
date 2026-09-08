"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify";
export async function requestUpdate(formData:FormData){const session=await auth();if(!session?.user?.id)return;const ticket=await prisma.ticket.findFirst({where:{id:String(formData.get("ticketId")),userId:session.user.id}});const details=String(formData.get("details")||"").trim();const launched=ticket&&(ticket.step===7||(ticket.package==="full-build"&&ticket.step>=4));if(!launched||details.length<3)return;await prisma.updateRequest.create({data:{ticketId:ticket.id,details}});await notifyAdmin(`New $50 update request`,`${ticket.businessName}\n${details}`);revalidatePath("/account");}
export async function decidePrototype(formData:FormData){const session=await auth();if(!session?.user?.id)return;const id=String(formData.get("ticketId")),decision=String(formData.get("decision"));const ticket=await prisma.ticket.findFirst({where:{id,userId:session.user.id,step:4}});if(!ticket)return;const status=decision==="approve"?"APPROVED":"STOPPED";await prisma.ticket.update({where:{id},data:{status,confirmedAt:decision==="approve"?new Date():null}});await notifyAdmin(`${ticket.businessName}: prototype ${decision==="approve"?"approved":"stopped"}`,`Ticket ${ticket.id}`);revalidatePath("/account");}
