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
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (!user?.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email };
    },
  })],
  callbacks: {
    signIn({ account, profile }) {
      return account?.provider !== "google" || Boolean(profile?.email && profile.email_verified === true);
    },
    async jwt({ token, user, account }) {
      if(account?.provider==="google"&&token.email){
        const email=token.email.toLowerCase();
        const dbUser=await prisma.user.upsert({where:{email},update:{name:token.name||email.split("@")[0]},create:{email,name:token.name||email.split("@")[0]}});
        token.id=dbUser.id;
      }else if(user?.id) token.id=user.id;
      return token;
    },
    session({ session, token }) { if (session.user) session.user.id = String(token.id); return session; },
  },
});
