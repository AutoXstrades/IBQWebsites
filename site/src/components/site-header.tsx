import Link from "next/link";
import { FileText, Home, Layers, Rocket, UserRound } from "lucide-react";
import { auth } from "@/auth";

const links = [["Packages", "/#packages"], ["Quote", "/#quote"], ["Process", "/#process"], ["FAQ", "/#faq"]];

export async function SiteHeader() {
  const session = await auth();
  const accountHref = session ? "/account" : "/login";
  return <>
    <header className="site-header"><div className="shell header-inner">
      <Link href="/" className="brand" aria-label="IBQ home"><span className="brand-mark">IBQ</span><span className="brand-copy">I BUILD QUALITY</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}<Link href={accountHref}>{session?"Account":"Sign in"}</Link></nav>
      <Link href="/#quote" className="btn btn-primary">Start a site</Link>
    </div></header>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link href="/"><Home size={19}/><span>Home</span></Link><Link href="/#packages"><Layers size={19}/><span>Packages</span></Link>
      <Link href="/#process"><FileText size={19}/><span>Process</span></Link><Link href={accountHref}><UserRound size={19}/><span>{session?"Account":"Sign in"}</span></Link>
      <Link href="/#quote"><Rocket size={19}/><span>Start</span></Link>
    </nav>
  </>;
}
