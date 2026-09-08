import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata={title:"FAQ",description:"Answers about IBQ websites, payments, ownership, updates, and launch."};
const faqs=[
  ["Do I really own the website?","Yes. After the full build is paid and the site launches, the completed site and delivered files are yours."],
  ["Is hosting really $0 a month?","Yes. We use a no-monthly-bill hosting setup for the packages shown. Your domain renews yearly."],
  ["What do I get for $50?","A visual prototype that shows the direction before you move into code."],
  ["What is the $100 downloadable prototype?","It is the next step after the visual: a clickable HTML prototype with files you can download and keep."],
  ["When does the working site get built?","After you approve the prototype, the $999 full build turns that direction into a custom-coded website with a 72-hour turnaround."],
  ["What counts as an update?","A focused post-launch content or visual change is $50. Larger new features are quoted before work starts."],
  ["Can I accept payments?","The $999 Full Website package supports cards, Apple Pay, and Google Pay. Single Page does not include Stripe."],
  ["What is the $5 AI quote?","It is a five-minute guided chat that turns your idea into a structured project ticket you can review and confirm."],
];
export default function FAQ(){return <><SiteHeader/><main className="shell page-pad narrow"><header className="page-heading"><p className="eyebrow">Straight answers</p><h1 className="font-display">Questions, <span className="gradient-text">answered.</span></h1><p>No fuzzy retainers. No mystery handoff.</p></header><section className="faq-list">{faqs.map(([q,a],i)=><details className="glass-card" key={q} open={i===0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section></main></>}
