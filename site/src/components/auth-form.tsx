"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth-actions";

export function AuthForm({mode}:{mode:"login"|"signup"}){
  const action=mode==="login"?loginAction:signupAction;
  const [state,formAction,pending]=useActionState(action,undefined);
  return <form action={formAction} className="auth-form glass-card">
    {mode==="signup"&&<label>Name<input name="name" autoComplete="name" required minLength={2} placeholder="Your name"/></label>}
    <label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label>
    <label>Password<input name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} required minLength={8} placeholder="8+ characters"/></label>
    {state?.error&&<p className="form-error" role="alert">{state.error}</p>}
    <button className="btn btn-primary" disabled={pending}>{pending?"Working…":mode==="login"?"Sign in":"Create account"}</button>
    <p>{mode==="login"?<>New to IBQ? <Link href="/signup">Create an account</Link></>:<>Already have an account? <Link href="/login">Sign in</Link></>}</p>
  </form>
}
