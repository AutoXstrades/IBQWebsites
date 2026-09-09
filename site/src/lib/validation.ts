import { z } from "zod";
export const packageSchema = z.enum(["starter", "business", "custom", "proto-visual", "proto-code", "full-build", "chatbot", "logo"]);
const short = z.string().trim().max(200).optional();
const long = z.string().trim().max(4000).optional();
export const httpsUrl = z.string().trim().max(2048).url().refine(value => { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; }, "Use an HTTPS URL without credentials.");
export const ticketSchema = z.object({
  package: packageSchema, businessName: z.string().trim().min(2).max(120), ownerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).optional(), email: z.string().trim().email().max(254).optional().or(z.literal("")), instagram: short, address: short, hours: short,
  logoUrl: httpsUrl.optional().or(z.literal("")), tagline: short, pages: z.array(z.string().max(40)).max(12).optional(), services: long, photos: long, cta: short, reviews: long, bookingTypes: long, availability: long, stripeScope: long, customScope: long, notes: long,
}).strict();
export const ticketIdSchema = z.string().min(1).max(100);
