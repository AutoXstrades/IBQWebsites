import { removeStoredFile, storeFile } from "@/lib/storage";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError, formBody, limit, sameOrigin, SafeError } from "@/lib/security";
import { validateFile } from "@/lib/upload-validation";

const extensions:Record<string,string>={
  "image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf","application/zip":"zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","text/plain":"txt",
};

export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.email||session.user.email.toLowerCase()!==(process.env.ADMIN_EMAIL||"").toLowerCase())return Response.json({error:"Forbidden"},{status:403});
  try {
  sameOrigin(request);
  if(Date.now()-session.user.authenticatedAt>15*60000)throw new SafeError("Sign in again before delivering files.",403);
  await limit([{scope:"admin-upload",subject:session.user.id,max:60,seconds:3600}]);
  const data=await formBody(request);
  const ticketId=String(data.get("ticketId")||"");
  const name=String(data.get("name")||"").trim().slice(0,100);
  const file=data.get("file");
  if(name.length<2||!(file instanceof File))return Response.json({error:"Add a name and choose a file."},{status:400});
  if(!extensions[file.type])return Response.json({error:"Use JPG, PNG, WebP, PDF, ZIP, DOCX, or TXT."},{status:400});
  if(!file.size||file.size>4*1024*1024)return Response.json({error:"File must be under 4 MB."},{status:400});
  if(!await prisma.ticket.findUnique({where:{id:ticketId},select:{id:true}}))return Response.json({error:"Ticket not found."},{status:404});
  let url: string | undefined;
  try {
    const clean=await validateFile(file);
    url=await storeFile("deliverables",ticketId,clean.file,clean.extension);
    const deliverable=await prisma.deliverable.create({data:{ticketId,name,url,mimeType:clean.file.type,kind:clean.file.type.startsWith("image/")?"IMAGE":"FILE"}});
    await prisma.auditEvent.create({data:{actorId:session.user.id,action:"DELIVERABLE_ADDED",ticketId,details:JSON.stringify({deliverableId:deliverable.id})}});
    return Response.json({deliverable:{id:deliverable.id,name:deliverable.name,url:`/api/files/deliverable/${deliverable.id}`}});
  } catch {
    if(url)await removeStoredFile(url).catch(()=>{});
    return Response.json({error:"Upload unavailable. Please try again."},{status:503});
  }
  }catch(error){return apiError(error);}
}
