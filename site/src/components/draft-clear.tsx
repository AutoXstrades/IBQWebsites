"use client";
import { useEffect } from "react";
import { clearDraft } from "@/lib/drafts";
export function DraftClear(){useEffect(()=>{clearDraft();},[]);return null;}
