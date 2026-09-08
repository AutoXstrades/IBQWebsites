"use client";

import { useEffect, useState } from "react";

export function VaultEntry(){
  const [mounted,setMounted]=useState(true);

  useEffect(()=>{
    const entry=document.getElementById("ibqEntry"),vault=document.getElementById("ibqVault"),orb=document.getElementById("ibqOrb"),headline=document.getElementById("ibqHeadline"),status=document.getElementById("ibqStatus"),progress=document.getElementById("ibqProgress"),bar=document.getElementById("ibqBar"),enter=document.getElementById("ibqEnterBtn"),skip=document.getElementById("ibqSkipBtn");
    if(!entry||!vault||!orb||!headline||!status||!progress||!bar||!enter||!skip)return;
    let timers:number[]=[];
    function revealReady(){headline!.textContent="Your vision starts here.";status!.textContent="Access unlocked.";enter!.classList.add("ready");skip!.style.visibility="hidden"}
    function afterVault(){vault!.style.display="none";orb!.classList.add("show");progress!.classList.add("show");headline!.textContent="Initializing your experience";status!.textContent="Connecting to IBQ...";([[20,"Connecting to IBQ..."],[42,"Loading visual systems..."],[66,"Preparing interactive experience..."],[85,"Quality check complete..."],[100,"Access unlocked."]] as [number,string][]).forEach((step,index)=>timers.push(window.setTimeout(()=>{bar!.style.width=step[0]+"%";status!.textContent=step[1];if(index===4)revealReady()},300+index*430)))}
    function skipAll(){timers.forEach(window.clearTimeout);timers=[];vault!.style.display="none";orb!.classList.add("show");progress!.classList.add("show");bar!.style.width="100%";revealReady()}
    function openSite(){entry!.classList.add("done");window.setTimeout(()=>setMounted(false),900)}
    enter.addEventListener("click",openSite);skip.addEventListener("click",skipAll);
    status.textContent="Verifying access...";
    timers.push(window.setTimeout(()=>{vault.classList.add("unlock");status.textContent="Vault unlocking..."},700));
    timers.push(window.setTimeout(()=>{vault.classList.add("open");status.textContent="Access granted."},1850));
    timers.push(window.setTimeout(afterVault,2850));
    return()=>{timers.forEach(window.clearTimeout);enter.removeEventListener("click",openSite);skip.removeEventListener("click",skipAll)};
  },[]);

  if(!mounted)return null;
  return <div id="ibqEntry" className="ibq-entry" aria-label="IBQ Websites vault entrance">
    <div className="ibq-entry-grid"/><div className="ibq-entry-aura"/>
    <div className="ibq-entry-content">
      <div id="ibqVault" className="ibq-vault-scene" aria-hidden="true"><div className="ibq-vault-frame"/><div className="ibq-vault-door"><div className="ibq-lockbar ibq-b1"/><div className="ibq-lockbar ibq-b2"/><div className="ibq-lockbar ibq-b3"/><div className="ibq-lockbar ibq-b4"/><div className="ibq-bolt t"/><div className="ibq-bolt r"/><div className="ibq-bolt b"/><div className="ibq-bolt l"/><div className="ibq-vault-hub"/></div></div>
      <div id="ibqOrb" className="ibq-orb-wrap" aria-hidden="true"><div className="ibq-ring ibq-r1"/><div className="ibq-ring ibq-r2"/><div className="ibq-ring ibq-r3"/><div className="ibq-core"><div className="ibq-core-logo">IBQ</div></div></div>
      <div className="ibq-entry-eyebrow">I Build Quality Websites</div>
      <h2 id="ibqHeadline">Secure access detected</h2>
      <div id="ibqStatus" className="ibq-entry-status" aria-live="polite">Preparing the vault...</div>
      <div id="ibqProgress" className="ibq-entry-progress"><div id="ibqBar" className="ibq-entry-bar"/></div>
      <button id="ibqEnterBtn" className="ibq-enter" type="button">ENTER IBQ</button>
      <button id="ibqSkipBtn" className="ibq-skip" type="button">Skip intro</button>
    </div>
  </div>;
}
