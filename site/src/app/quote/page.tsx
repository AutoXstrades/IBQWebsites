import type { Metadata } from "next";
import { auth } from "@/auth";
import { QuoteForm } from "@/components/quote-form";
import { SiteHeader } from "@/components/site-header";
export const metadata:Metadata={title:"Get a quote",description:"Start a free written quote or a focused five-minute AI quote."};
export default async function Quote({searchParams}:{searchParams:Promise<{package?:string}>}){const session=await auth();const q=await searchParams;const initial=["starter","business","custom","full-build","proto-visual","proto-code","chatbot","logo"].includes(q.package||"")?q.package!:"starter";return <><SiteHeader/><main className="shell page-pad"><header className="page-heading"><p className="eyebrow">Start with the details</p><h1 className="font-display">Your idea. <span className="gradient-text">A clear ticket.</span></h1><p>Write it in free, or use the $5 guided AI quote for five focused minutes.</p></header><QuoteForm authenticated={!!session} initialPackage={initial}/></main></>}
