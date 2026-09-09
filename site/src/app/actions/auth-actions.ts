"use server";
import { AuthError } from "next-auth";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth, passwordAuthEnabled, signIn, signOut } from "@/auth";
import { headers } from "next/headers";
import { clientIp, limit } from "@/lib/security";

export type AuthState = { error?: string } | undefined;

export async function googleLoginAction(){ await limit([{scope:"oauth-start",subject:clientIp(await headers()),max:20,seconds:900}]); await signIn("google",{redirectTo:"/account"}); }

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!passwordAuthEnabled) return { error: "Continue with Google to sign in." };
  try { await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/account" }); }
  catch (error) { if (error instanceof AuthError) return { error:"Email or password is incorrect." }; throw error; }
}

export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!passwordAuthEnabled) return { error: "Continue with Google to create your account." };
  try { await limit([{scope:"signup",subject:clientIp(await headers()),max:5,seconds:3600}]); } catch { return {error:"Please try again later."}; }
  const parsed=z.object({ name:z.string().trim().min(2).max(100), email:z.string().trim().email().max(254), password:z.string().min(8).max(72) }).safeParse({ name:formData.get("name"), email:formData.get("email"), password:formData.get("password") });
  if(!parsed.success) return { error:"Enter your name, a valid email, and a password with at least 8 characters." };
  const email=parsed.data.email.toLowerCase();
  if (process.env.NODE_ENV === "production" && email === process.env.ADMIN_EMAIL?.toLowerCase()) return { error: "Use Google sign-in for this account." };
  if(await prisma.user.findUnique({where:{email}})) return { error:"An account already exists for that email." };
  await prisma.user.create({data:{name:parsed.data.name,email,passwordHash:await hash(parsed.data.password,12)}});
  try { await signIn("credentials",{email,password:parsed.data.password,redirectTo:"/account"}); }
  catch(error){ if(error instanceof AuthError) return {error:"Your account was created. Please sign in."}; throw error; }
}

export async function logoutAction(){ const session = await auth(); if(session?.user?.id) await prisma.user.updateMany({where:{id:session.user.id},data:{sessionVersion:{increment:1}}}); await signOut({redirectTo:"/login?clearDraft=1"}); }
