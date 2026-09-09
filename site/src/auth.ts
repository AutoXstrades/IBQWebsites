import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, limit } from "@/lib/security";

export const passwordAuthEnabled = process.env.NODE_ENV !== "production";
export const googleAuthConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(googleAuthConfigured ? [Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET!, authorization: { params: { prompt: "select_account", max_age: 0 } } })] : []),
    ...(passwordAuthEnabled ? [Credentials({ credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(72) }).safeParse(credentials);
        if (!parsed.success) return null;
        try { await limit([{ scope: "password", subject: clientIp(request.headers), max: 10, seconds: 900 }, { scope: "password-email", subject: parsed.data.email.toLowerCase(), max: 10, seconds: 900 }]); } catch { return null; }
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user?.passwordHash || user.disabledAt || !(await compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    })] : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return passwordAuthEnabled;
      if (!profile?.email || profile.email_verified !== true || profile.email.length > 254) return false;
      await limit([{ scope: "google-signin", subject: profile.email.toLowerCase(), max: 20, seconds: 3600 }, { scope: "google-global", subject: "all", max: 500, seconds: 3600 }]);
      const existing = await prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
      return !existing?.passwordHash && !existing?.disabledAt;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const email = token.email.toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.passwordHash || existing?.disabledAt) return null;
        const dbUser = existing || await prisma.user.upsert({ where: { email }, update: {}, create: { email, name: (token.name || email.split("@")[0]).slice(0, 100) } });
        if (dbUser.passwordHash || dbUser.disabledAt) return null;
        token.id = dbUser.id;
      } else if (user?.id) token.id = user.id;
      if (typeof token.id !== "string") return null;
      const current = await prisma.user.findUnique({ where: { id: token.id }, select: { sessionVersion: true, disabledAt: true, email: true, name: true } });
      if (!current || current.disabledAt) return null;
      if (account || user) { token.sessionVersion = current.sessionVersion; token.authenticatedAt = Date.now(); }
      if (token.sessionVersion !== current.sessionVersion || typeof token.authenticatedAt !== "number") return null;
      const max = current.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() ? 8 * 3600000 : 7 * 86400000;
      if (Date.now() - token.authenticatedAt > max) return null;
      token.email = current.email; token.name = current.name;
      return token;
    },
    session({ session, token }) { session.user.id = String(token.id); session.user.authenticatedAt = Number(token.authenticatedAt); return session; },
  },
});
