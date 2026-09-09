import { auth } from "@/auth";
import { notifyAdmin } from "@/lib/notify";
import { packageCents } from "@/lib/stripe";
import { ticketSchema } from "@/lib/validation";
import { apiError, jsonBody, limit, sameOrigin, SafeError, serial } from "@/lib/security";
export async function POST(request: Request) {
  const session=await auth();if(!session?.user?.id)return Response.json({error:"Sign in to create your ticket."},{status:401});
  try {
    sameOrigin(request);
    await limit([{scope:"tickets",subject:session.user.id,max:5,seconds:86400}]);
    const parsed=ticketSchema.safeParse(await jsonBody(request));if(!parsed.success)throw new SafeError("Check required fields and text lengths.");
    const product=parsed.data.package==="business"?"full-build":parsed.data.package;
    const ticket=await serial(async tx=>{
      if(await tx.ticket.count({where:{userId:session.user.id}})>=25)throw new SafeError("Contact IBQ before opening more projects.",429);
      return tx.ticket.create({data:{...parsed.data,package:product,quotedPrice:product==="custom"?null:packageCents[product],pages:JSON.stringify(parsed.data.pages||[]),userId:session.user.id,email:parsed.data.email||session.user.email}});
    });
    await notifyAdmin("New ticket",ticket.id);
    return Response.json({ticket:{id:ticket.id}});
  }catch(error){return apiError(error);}
}
