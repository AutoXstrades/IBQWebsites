import { DraftClear } from "@/components/draft-clear";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleAuthConfigured, passwordAuthEnabled } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SiteHeader } from "@/components/site-header";
export const metadata:Metadata={title:"Sign in"};
export default async function Login({searchParams}:{searchParams:Promise<{reauth?:string;clearDraft?:string}>}){if((await auth())?.user?.id && !(await searchParams).reauth)redirect("/account");return <>{(await searchParams).clearDraft&&<DraftClear/>}<SiteHeader/><main className="shell page-pad auth-page"><header className="page-heading"><p className="eyebrow">Welcome back</p><h1 className="font-display">Your build, <span className="gradient-text">in one place.</span></h1><p>Sign in to see the ticket, progress, payments, and previews for your site.</p></header><section className="auth-options"><GoogleSignIn configured={googleAuthConfigured}/>{passwordAuthEnabled&&<details open={!googleAuthConfigured}><summary>Use email and password instead</summary><AuthForm mode="login"/></details>}<p className="muted">Never share passwords, payment-card details, or API keys in quote notes.</p></section></main></>}
