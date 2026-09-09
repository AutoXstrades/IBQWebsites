const key = "ibq-draft-v2";
type Draft = { owner: string | null; expiresAt: number; values: Record<string, unknown> };
export function clearDraft() { try { sessionStorage.removeItem(key); localStorage.removeItem("ibq-quote-draft"); localStorage.removeItem("ibq-quote-mode"); } catch {} }
export function readDraft(owner: string | null = null) {
  try {
    // Legacy indefinite drafts are intentionally removed, not silently migrated.
    localStorage.removeItem("ibq-quote-draft"); localStorage.removeItem("ibq-quote-mode");
    const raw=sessionStorage.getItem(key); if(!raw)return null;
    const draft=JSON.parse(raw) as Draft;
    if(!draft.values||draft.expiresAt<Date.now()||(draft.owner&&draft.owner!==owner)){clearDraft();return null;}
    if(owner&&!draft.owner){draft.owner=owner;sessionStorage.setItem(key,JSON.stringify(draft));}
    return draft.values;
  }catch{clearDraft();return null;}
}
export function saveDraft(values: Record<string, unknown>, owner: string | null = null) {
  try { localStorage.removeItem("ibq-quote-draft"); localStorage.removeItem("ibq-quote-mode"); sessionStorage.setItem(key,JSON.stringify({owner,expiresAt:Date.now()+86400000,values})); } catch {}
}
