/* eslint-disable @next/next/no-img-element -- customer and admin supplied images may use arbitrary hosts */
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink, FileText, ImageIcon, LogOut } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isFixedService, packageCents, paymentFor } from "@/lib/stripe";
import { decidePrototype, requestUpdate } from "@/app/actions/account-actions";
import { logoutAction } from "@/app/actions/auth-actions";
import { PayButton, SavedDraftNotice, UploadForm } from "@/components/account-controls";
import { SiteHeader } from "@/components/site-header";

export const metadata:Metadata={title:"My account"};
export const dynamic="force-dynamic";
const studioSteps=["Quote","Pay 50%","Prototype","Confirm or stop","Pay 20%","Preview","Pay 30% + launch"];
const serviceSteps:Record<string,string[]>={
  "proto-visual":["Order","Paid","Visual in progress","Visual delivered"],
  "proto-code":["Order","Paid","Prototype in progress","Files delivered"],
  "full-build":["Approved direction","Paid","72-hour build","Launched"],
  chatbot:["Order","Paid","Setup in progress","Delivered"],
  logo:["Order","Paid","Design in progress","Delivered"],
};
const productNames:Record<string,string>={starter:"Single Page",business:"Full Website",custom:"Custom","proto-visual":"$50 visual prototype","proto-code":"$100 downloadable prototype","full-build":"$999 full website build",chatbot:"AI chatbot",logo:"Logo"};
const nextOffers:Record<string,{label:string;href:string}>={"proto-visual":{label:"Continue to the $100 downloadable prototype",href:"/?package=proto-code#intake"},"proto-code":{label:"Continue to the $999 full website build",href:"/?package=full-build#intake"}};

export default async function Account(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login");
  const tickets=await prisma.ticket.findMany({
    where:{userId:session.user.id},orderBy:{createdAt:"desc"},
    include:{prototypeImages:true,payments:{orderBy:{createdAt:"desc"}},uploads:true,updateRequests:true,deliverables:{orderBy:{createdAt:"desc"}}},
  });
  const isAdmin=session.user.email?.toLowerCase()===(process.env.ADMIN_EMAIL||"").toLowerCase();
  return <><SiteHeader/><main className="shell page-pad">
    <header className="dashboard-head"><div><p className="eyebrow">Customer account</p><h1 className="font-display">Hey, {session.user.name?.split(" ")[0]}.</h1><p>Your project details, progress, payments, reference uploads, and delivered files all stay here.</p></div><div className="account-actions">{isAdmin&&<Link href="/admin" className="btn btn-secondary">Admin</Link>}<form action={logoutAction}><button className="btn btn-secondary"><LogOut size={18}/>Log out all devices</button></form></div></header>
    <SavedDraftNotice userId={session.user.id}/>
    {tickets.length===0?<section className="glass-card empty-state"><p className="eyebrow">No ticket yet</p><h2 className="font-display">Let’s get the idea on paper.</h2><Link className="btn btn-primary" href="/#intake">Start a quote</Link></section>:tickets.map(ticket=>{
      const steps=serviceSteps[ticket.package]||studioSteps;
      const fixed=isFixedService(ticket.package);
      const total=ticket.quotedPrice||packageCents[ticket.package]||250000;
      const customWaiting=ticket.package==="custom"&&!ticket.quotedPrice;
      const needsDecision=ticket.step===4&&!['APPROVED','STOPPED'].includes(ticket.status);
      const paymentReady=!customWaiting&&(fixed?ticket.step===1:([1,6].includes(ticket.step)||(ticket.step===4&&ticket.status==="APPROVED")));
      const due=paymentReady?paymentFor(ticket.package,ticket.step,total):null;
      const complete=ticket.step>=steps.length;
      const nextOffer=complete?nextOffers[ticket.package]:undefined;
      return <article className="project-card glass-card" key={ticket.id}>
        <div className="project-title"><div><span className="ticket-id">#{ticket.id.slice(-6).toUpperCase()}</span><h2 className="font-display">{ticket.businessName}</h2><p>{productNames[ticket.package]||ticket.package} · step {Math.min(ticket.step,steps.length)} of {steps.length}</p></div><span className="status-pill">{ticket.status==="STOPPED"?"Stopped":steps[Math.min(ticket.step,steps.length)-1]}</span></div>
        <ol className="stepper" style={{"--step-count":steps.length} as CSSProperties}>{steps.map((step,index)=><li key={step} className={index+1<ticket.step?"done":index+1===ticket.step?"current":""}><span>{index+1}</span><small>{step}</small></li>)}</ol>
        <div className="dashboard-grid"><section><h3>Ticket details</h3><dl><div><dt>Owner</dt><dd>{ticket.ownerName}</dd></div><div><dt>Contact</dt><dd>{ticket.phone||ticket.email||"Not added"}</dd></div><div><dt>Services</dt><dd>{ticket.services||"Not added"}</dd></div><div><dt>Notes</dt><dd>{ticket.notes||"No extra notes"}</dd></div></dl></section>
          <section><h3>Next action</h3>{customWaiting?<p className="muted">IBQ is preparing your custom quote. No deposit is due until the total is attached.</p>:ticket.status==="STOPPED"?<p className="muted">This project stopped after prototype review. Contact IBQ if you want to reopen it.</p>:!fixed&&needsDecision?<form action={decidePrototype} className="decision-actions"><input type="hidden" name="ticketId" value={ticket.id}/><button name="decision" value="approve" className="btn btn-primary">Confirm prototype</button><button name="decision" value="stop" className="btn btn-secondary">Stop here</button></form>:due?<PayButton ticketId={ticket.id} label={due.label} amount={due.amount}/>:nextOffer?<Link className="btn btn-primary" href={nextOffer.href}>{nextOffer.label}</Link>:<p className="muted">Nothing to pay right now. IBQ will move the project forward when this step is ready.</p>}{ticket.previewUrl&&<a className="preview-link" href={ticket.previewUrl} target="_blank" rel="noreferrer">Open preview <ExternalLink size={17}/></a>}<UploadForm ticketId={ticket.id}/></section>
        </div>
        {ticket.deliverables.length>0&&<section className="delivery-section"><div className="section-row"><div><p className="eyebrow">From IBQ</p><h3>Your images & files</h3></div><span>{ticket.deliverables.length} delivered</span></div><div className="delivery-grid">{ticket.deliverables.map(file=><a className="delivery-card" href={`/api/files/deliverable/${file.id}`} target="_blank" rel="noreferrer" download key={file.id}>{file.kind==="IMAGE"?<span className="delivery-thumb"><img src={`/api/files/deliverable/${file.id}`} alt=""/></span>:<span className="delivery-icon"><FileText/></span>}<span className="delivery-copy"><strong>{file.name}</strong><small>{file.kind==="IMAGE"?"Image":"File"} · {file.createdAt.toLocaleDateString()}</small></span><Download size={18}/></a>)}</div></section>}
        {ticket.prototypeImages.length>0&&<section className="prototype-section"><h3>Prototype images</h3><div className="prototype-grid">{ticket.prototypeImages.map(image=><a href={image.url} target="_blank" rel="noreferrer" key={image.id}><img src={image.url} alt={`${ticket.businessName} prototype`}/></a>)}</div></section>}
        {ticket.uploads.length>0&&<section className="reference-section"><h3>Your reference uploads</h3><div className="reference-list">{ticket.uploads.map(upload=><a href={`/api/files/reference/${upload.id}`} target="_blank" rel="noreferrer" key={upload.id}><ImageIcon size={17}/><span>{upload.filename}</span><ExternalLink size={15}/></a>)}</div></section>}
        {((!fixed&&ticket.step===7)||(ticket.package==="full-build"&&complete))&&<form action={requestUpdate} className="update-form"><input type="hidden" name="ticketId" value={ticket.id}/><label>Request a $50 update<textarea name="details" required minLength={3} placeholder="Tell us exactly what should change."/></label><button className="btn btn-secondary">Request update</button>{ticket.updateRequests.length>0&&<small>{ticket.updateRequests.length} update request(s) on file.</small>}</form>}
        <footer className="project-lock">{fixed?complete?"This stage is complete. Your delivered files appear above when attached by IBQ.":"Your images, files, and next stage will appear here as the project moves forward.":"Source code and domain control unlock after the final step is paid."}</footer>
      </article>})}
  </main></>;
}
