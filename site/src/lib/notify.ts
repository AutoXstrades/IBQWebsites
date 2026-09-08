export async function notifyAdmin(subject:string,body:string){
  const to=process.env.ADMIN_EMAIL;
  if(!to)return;
  if(process.env.RESEND_API_KEY){
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.FROM_EMAIL||"IBQ <onboarding@resend.dev>",to:[to],subject,text:body})}).catch(console.error);
  } else console.info(`[IBQ admin notification → ${to}] ${subject}\n${body}`);
}
