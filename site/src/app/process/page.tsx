import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title:"Process", description:"The clear IBQ prototype-to-launch flow." };
const steps=[
  ["01","$50 visual","See the look and direction before code."],
  ["02","Review","Request focused changes and lock the direction."],
  ["03","$100 prototype","Receive a clickable HTML prototype and downloadable files."],
  ["04","Approve","Confirm that this is the website you want built."],
  ["05","$999 full build","IBQ turns the approved direction into the working website."],
  ["06","72 hours","Receive the finished build, launch it, and own the site."],
];
export default function Process(){return <><SiteHeader/><main className="shell page-pad"><header className="page-heading"><p className="eyebrow">IBQ build flow</p><h1 className="font-display">See it first.<br/><span className="gradient-text">Then build it.</span></h1><p>Move forward only after each stage is clear and approved.</p></header><section className="process-grid">{steps.map(([num,title,copy])=><article className="glass-card step-card" key={num}><span>{num}</span><h2>{title}</h2><p>{copy}</p></article>)}</section><div className="money-flow glass-card"><div><strong>$50</strong><span>Visual</span></div><div><strong>$100</strong><span>Prototype</span></div><div><strong>$999</strong><span>Full build · 72 hours</span></div></div><div className="center-action"><Link href="/#quote" className="btn btn-primary">Start a visual</Link></div></main></>}
