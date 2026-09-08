import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const googleAuthConfigured=Boolean(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(googleAuthConfigured?[Google({clientId:process.env.AUTH_GOOGLE_ID!,clientSecret:process.env.AUTH_GOOGLE_SECRET!})]:[]),
    Credentials({
    credentials: { email: { type: "email" }, password: { type: "password" } },
    authorize: async (credentials) => {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(credentials);
      if (!parsed.success) return null;
      if (process.env.NODE_ENV === "production" && parsed.data.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email };
    },
  })],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || profile.email_verified !== true) return false;
      const existing = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() }, select: { passwordHash: true } });
      // Password signups have not proved email ownership; never silently link them to Google.
      return !existing?.passwordHash;
    },
    async jwt({ token, user, account }) {
      if(account?.provider==="google"&&token.email){
        const email=token.email.toLowerCase();
        const dbUser=await prisma.$transaction(async tx=>{
          const existing=await tx.user.findUnique({where:{email}});
          if(existing?.passwordHash)throw new Error("Use the existing account's sign-in method before linking Google.");
          return existing||await tx.user.create({data:{email,name:token.name||email.split("@")[0]}});
        });
        token.id=dbUser.id;
      }else if(user?.id) token.id=user.id;
      return token;
    },
    session({ session, token }) { if (session.user) session.user.id = String(token.id); return session; },
  },
});
