import { auth } from "@/auth";
import { PrototypeSite } from "@/components/prototype-site";
import { VaultEntry } from "@/components/vault-entry";

export default async function Home({searchParams}:{searchParams:Promise<{package?:string}>}) {
  const [session, query] = await Promise.all([auth(), searchParams]);
  const initialPackage = ["starter","business","full-build","custom","proto-visual","proto-code","chatbot","logo"].includes(query.package || "") ? query.package! : "starter";
  return <><VaultEntry/><PrototypeSite authenticated={!!session} initialPackage={initialPackage}/></>;
}
