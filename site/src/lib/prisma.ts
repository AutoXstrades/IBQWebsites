import { PrismaClient } from "@prisma/client";
import path from "node:path";

function databaseUrl() {
  const value=process.env.DATABASE_URL;
  if(!value?.startsWith("postgres"))return value;
  const url=new URL(value);url.searchParams.set("sslmode","require");url.searchParams.set("sslaccept","strict");url.searchParams.set("sslcert",path.join(process.cwd(),"certs","supabase-ca.crt"));
  return url.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({datasources:{db:{url:databaseUrl()}}});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
