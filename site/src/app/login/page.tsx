import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleAuthConfigured } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SiteHeader } from "@/components/site-header";
export const metadata:Metadata={title:"Sign in"};
export default async function Login(){if(await auth())redirect("/account");return <><SiteHeader/><main className="shell page-pad auth-page"><header className="page-heading"><p className="eyebrow">Welcome back</p><h1 className="font-display">Your build, <span className="gradient-text">in one place.</span></h1><p>Sign in to see the ticket, progress, payments, and previews for your site.</p></header><section className="auth-options"><GoogleSignIn configured={googleAuthConfigured}/><details open={!googleAuthConfigured}><summary>Use email and password instead</summary><AuthForm mode="login"/></details></section></main></>}
