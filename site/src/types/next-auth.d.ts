import "next-auth";
declare module "next-auth" { interface Session { user: { id: string; authenticatedAt: number; name?: string | null; email?: string | null; image?: string | null } } }
