import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isFixedService } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin";
import { attachProjectAssets, markPayment, setProjectStep, revokeUserSessions } from "@/app/actions/admin-actions";
import { AdminDeliverableForm } from "@/components/admin-deliverable-form";
import { SiteHeader } from "@/components/site-header";

export const metadata:Metadata={title:"Admin"};
export const dynamic="force-dynamic";

export default async function Admin(){
  await requireAdmin();
  const[tickets,users]=await Promise.all([
    prisma.ticket.findMany({orderBy:{createdAt:"desc"},include:{user:true,payments:true,prototypeImages:true,deliverables:true}}),
    prisma.user.findMany({orderBy:{createdAt:"desc"},include:{_count:{select:{tickets:true}}}}),
  ]);
  return <><SiteHeader/><main className="shell page-pad">
    <header className="dashboard-head"><div><p className="eyebrow">IBQ control room</p><h1 className="font-display">Projects & people.</h1><p>Move the build, attach what customers can see, and record the money.</p></div><Link className="btn btn-secondary" href="/account"><ArrowLeft size={18}/>My account</Link></header>
    <section className="admin-stats"><div className="glass-card"><strong>{tickets.length}</strong><span>tickets</span></div><div className="glass-card"><strong>{users.length}</strong><span>users</span></div><div className="glass-card"><strong>{tickets.filter(t=>t.step===7).length}</strong><span>launched</span></div></section>
    <section className="admin-list"><h2 className="section-title font-display">Tickets</h2>{tickets.map(ticket=><article className="glass-card admin-ticket" key={ticket.id}>
      <header><div><span className="ticket-id">#{ticket.id.slice(-6).toUpperCase()}</span><h3>{ticket.businessName}</h3><p>{ticket.ownerName} · {ticket.user?.email||ticket.email||"No email"} · {ticket.package}</p></div><span className="status-pill">Step {ticket.step}</span></header>
      <div className="admin-forms">
        <form action={setProjectStep} className="admin-form"><input type="hidden" name="ticketId" value={ticket.id}/><label>Project step<select name="step" defaultValue={ticket.step}>{(isFixedService(ticket.package)?[1,2,3,4]:[1,2,3,4,5,6,7]).map(x=><option value={x} key={x}>{x}</option>)}</select></label><label>Quoted total (USD)<input name="quotedPrice" type="number" min="0.01" step=".01" defaultValue={ticket.quotedPrice?(ticket.quotedPrice/100).toFixed(2):""} placeholder={ticket.package==="custom"?"Required before deposit":"Optional"}/></label><button className="btn btn-secondary">Save quote & step</button></form>
        <form action={attachProjectAssets} className="admin-form"><input type="hidden" name="ticketId" value={ticket.id}/><label>Prototype image URL<input name="imageUrl" type="url" placeholder="https://…"/></label><label>Preview URL<input name="previewUrl" type="url" defaultValue={ticket.previewUrl||""} placeholder="https://…"/></label><button className="btn btn-secondary">Attach</button></form>
        <form action={markPayment} className="admin-form"><input type="hidden" name="ticketId" value={ticket.id}/><label>Payment<select name="type">{isFixedService(ticket.package)&&<option value="FULL">Full service payment</option>}<option value="DEPOSIT">50% deposit</option><option value="BUILD">20% build</option><option value="LAUNCH">30% launch</option></select></label><label>Amount (USD)<input name="amount" type="number" min="0.01" step=".01" required/></label><label>Reason<input name="reason" minLength={8} maxLength={300} required/></label><label>Receipt reference<input name="receipt" minLength={3} maxLength={100} required/></label><label><input type="checkbox" name="confirmed" value="yes" required/> I verified this payment</label><button className="btn btn-secondary">Mark paid</button></form>
      </div>
      <AdminDeliverableForm ticketId={ticket.id}/>
      <footer>{ticket.payments.filter(p=>p.status==="PAID").length} paid payment(s) · {ticket.prototypeImages.length} prototype image(s) · {ticket.deliverables.length} delivered file(s)</footer>
    </article>)}</section>
    <section><h2 className="section-title font-display"><Users/> Users</h2><div className="user-table glass-card">{users.map(user=><div key={user.id}><span><strong>{user.name}</strong><small>{user.email}</small></span><span>{user._count.tickets} ticket(s)</span><time>{user.createdAt.toLocaleDateString()}</time><form action={revokeUserSessions}><input type="hidden" name="userId" value={user.id}/><button className="btn btn-secondary">Revoke sessions</button></form></div>)}</div></section>
  </main></>;
}
