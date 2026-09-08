import type { Metadata } from "next";
import Link from "next/link";
import { Check, Globe2, RefreshCw, Server } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Packages", description: "Straightforward website packages for service businesses." };
const plans = [
  { slug:"starter", name:"Single Page", price:"$500", audience:"Simple shops: hair, nails, barber, lashes, lawn, cleaning, food truck, trainer.", items:["One page","Photos","Tap-to-call","Map and hours","No Stripe"] },
  { slug:"full-build", name:"Full Website", price:"$999", audience:"Salon, restaurant, contractor, church, daycare.", items:["More pages","Gallery or menu","Booking","Contact form","Cards, Apple Pay, Google Pay"], featured:true },
  { slug:"custom", name:"Custom", price:"From $2,500", audience:"Quoted first for ideas that go beyond booking, location, and gallery.", items:["AI tools","Agents","News feeds","Custom scope","Quoted first"] },
];
export default function Packages() { return <><SiteHeader/><main className="shell page-pad">
  <header className="page-heading centered"><p className="eyebrow">Simple pricing</p><h1 className="font-display">Priced for the work.<br/><span className="gradient-text">Not a subscription.</span></h1><p>Pay once for the build. Domain is a yearly renewal. Updates are $50. No monthly hosting.</p></header>
  <section className="pricing-grid" aria-label="Website packages">{plans.map(plan=><article className={`glass-card price-card ${plan.featured?"featured":""}`} key={plan.slug}>{plan.featured&&<span className="most-shops">MOST SHOPS</span>}<p className="eyebrow">{plan.name}</p><h2 className="font-display">{plan.price}</h2><p className="audience">{plan.audience}</p><ul>{plan.items.map(item=><li key={item}><Check size={20}/>{item}</li>)}</ul><Link className={`btn ${plan.slug==="custom"?"btn-secondary":"btn-primary"}`} href={`/quote?package=${plan.slug}`}>Start</Link></article>)}</section>
  <section className="mini-tiles"><div className="glass-card"><RefreshCw/><span>Updates<strong>$50 each</strong></span></div><div className="glass-card"><Globe2/><span>Domain<strong>Yearly renewal</strong></span></div><div className="glass-card"><Server/><span>Monthly hosting<strong>$0</strong></span></div></section>
  </main></>; }
