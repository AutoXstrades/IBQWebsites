import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, googleAuthConfigured } from "@/auth";
import { AuthForm } from "@/components/auth-form";
import { GoogleSignIn } from "@/components/google-sign-in";
import { SiteHeader } from "@/components/site-header";
export const metadata:Metadata={title:"Create account"};
export default async function Signup(){if(await auth())redirect("/account");return <><SiteHeader/><main className="shell page-pad auth-page"><header className="page-heading"><p className="eyebrow">Start here</p><h1 className="font-display">Create your <span className="gradient-text">IBQ account.</span></h1><p>Your saved quote, uploads, payments, and launch progress stay together.</p></header><section className="auth-options"><GoogleSignIn configured={googleAuthConfigured}/><details open={!googleAuthConfigured}><summary>Use email and password instead</summary><AuthForm mode="signup"/></details></section></main></>}
