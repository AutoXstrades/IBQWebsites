"use client";
import { useState } from "react";
import { UploadCloud } from "lucide-react";

export function AdminDeliverableForm({ticketId}:{ticketId:string}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function upload(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    setBusy(true);setMessage("");
    const response=await fetch("/api/admin/deliverables",{method:"POST",body:new FormData(form)});
    const data=await response.json();
    setBusy(false);
    if(!response.ok){setMessage(data.error||"Upload failed.");return;}
    setMessage("Delivered to the customer account.");
    form.reset();
    window.location.reload();
  }
  return <form className="admin-delivery-form" onSubmit={upload}>
    <input type="hidden" name="ticketId" value={ticketId}/>
    <label>Customer-facing name<input name="name" required minLength={2} maxLength={100} placeholder="Homepage prototype"/></label>
    <label>Image or file (under 4 MB)<input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"/></label>
    <button className="btn btn-secondary" disabled={busy}><UploadCloud size={17}/>{busy?"Uploading…":"Deliver file"}</button>
    {message&&<p role="status">{message}</p>}
  </form>;
}
