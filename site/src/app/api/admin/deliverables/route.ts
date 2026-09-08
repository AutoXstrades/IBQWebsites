import { removeStoredFile, storeFile } from "@/lib/storage";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const extensions:Record<string,string>={
  "image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf","application/zip":"zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx","text/plain":"txt",
};

export async function POST(request:Request){
  const session=await auth();
  if(!session?.user?.email||session.user.email.toLowerCase()!==(process.env.ADMIN_EMAIL||"").toLowerCase())return Response.json({error:"Forbidden"},{status:403});
  const data=await request.formData();
  const ticketId=String(data.get("ticketId")||"");
  const name=String(data.get("name")||"").trim().slice(0,100);
  const file=data.get("file");
  if(name.length<2||!(file instanceof File))return Response.json({error:"Add a name and choose a file."},{status:400});
  if(!extensions[file.type])return Response.json({error:"Use JPG, PNG, WebP, PDF, ZIP, DOCX, or TXT."},{status:400});
  if(!file.size||file.size>4*1024*1024)return Response.json({error:"File must be under 4 MB."},{status:400});
  if(!await prisma.ticket.findUnique({where:{id:ticketId},select:{id:true}}))return Response.json({error:"Ticket not found."},{status:404});
  let url: string | undefined;
  try {
    url=await storeFile("deliverables",ticketId,file,extensions[file.type]);
    const deliverable=await prisma.deliverable.create({data:{ticketId,name,url,mimeType:file.type,kind:file.type.startsWith("image/")?"IMAGE":"FILE"}});
    return Response.json({deliverable:{id:deliverable.id,name:deliverable.name,url:`/api/files/deliverable/${deliverable.id}`}});
  } catch {
    if(url)await removeStoredFile(url).catch(()=>{});
    return Response.json({error:"Upload unavailable. Please try again."},{status:503});
  }
}
