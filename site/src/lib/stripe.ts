import Stripe from "stripe";
export function getStripe(){const key=process.env.STRIPE_SECRET_KEY,mode=process.env.PAYMENTS_MODE;if(!key||!['test','live'].includes(mode||''))return null;if(mode==='test'&&!key.startsWith('sk_test_'))return null;if(mode==='live'&&(process.env.PAYMENTS_LIVE_APPROVED!=='true'||!key.startsWith('sk_live_')))return null;return new Stripe(key);}
export const fixedServiceCents:Record<string,number>={"proto-visual":5000,"proto-code":10000,"full-build":99900,chatbot:25000,logo:5000};
export const packageCents:Record<string,number>={starter:50000,business:99900,custom:250000,...fixedServiceCents};
const fixedLabels:Record<string,string>={"proto-visual":"Pay for visual prototype","proto-code":"Pay for downloadable prototype","full-build":"Pay for full website build",chatbot:"Pay for AI chatbot",logo:"Pay for logo"};
export function isFixedService(product:string){return Object.hasOwn(fixedServiceCents,product)}
export function paymentFor(product:string,step:number,total:number){if(isFixedService(product))return step===1?{type:"FULL",label:fixedLabels[product],amount:total,nextStep:2}:null;return installmentFor(step,total)}
export function installmentFor(step:number,total:number){if(step<=1)return{type:"DEPOSIT",label:"Pay 50% deposit",amount:Math.round(total*.5),nextStep:2};if(step<=4)return{type:"BUILD",label:"Pay 20% to build",amount:Math.round(total*.2),nextStep:5};return{type:"LAUNCH",label:"Pay final 30%",amount:total-Math.round(total*.5)-Math.round(total*.2),nextStep:7};}
