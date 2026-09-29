import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8')
  .replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const v9=fs.readFileSync(new URL('./v9.js',import.meta.url),'utf8');

const dom=new JSDOM(html,{url:'https://soutu-pro.vercel.app/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
Object.defineProperty(window,'matchMedia',{value:()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}})});
Object.defineProperty(window,'scrollTo',{value:()=>{}});
Object.defineProperty(window.navigator,'serviceWorker',{value:{register:async()=>({})},configurable:true});
Object.defineProperty(window.navigator,'clipboard',{value:{write:async()=>{},writeText:async()=>{}},configurable:true});
Object.defineProperty(window.URL,'createObjectURL',{value:()=> 'blob:qa'});
Object.defineProperty(window.URL,'revokeObjectURL',{value:()=>{}});
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLElement.prototype.animate=function(){return{finished:Promise.resolve(),cancel(){}}};
window.SOUTU_CONFIG={tempUploadEndpoint:'https://soutu-pro.vercel.app',productSearchEndpoint:'https://soutu-pro.vercel.app',tempUploadTtlMinutes:30,tempUploadProvider:'vercel'};
window.fetch=async()=>({ok:false,status:503,json:async()=>({}),blob:async()=>new window.Blob()});

const failures=[];
const check=(cond,msg)=>{if(!cond)failures.push(msg)};
try{window.eval(app)}catch(e){failures.push('app.js init: '+e.stack)}
try{window.eval(v9)}catch(e){failures.push('v9.js init: '+e.stack)}

check(!!window.document.querySelector('#uploader'),'uploader exists after init');
check(!window.document.querySelector('#searchView')?.classList.contains('hidden'),'search view starts visible');
check(window.document.querySelectorAll('.engine-card').length===10,'10 engine cards render');
check(window.document.querySelectorAll('.engine-brand img').length===10,'10 builtin engine brand images render');
check(window.document.querySelectorAll('.engine-custom-mark').length===0,'builtin grid has no initial-letter custom marks');
check(window.document.querySelectorAll('.market-card').length===10,'10 marketplace cards render');
check(window.document.querySelectorAll('.market-brand img').length===10,'marketplace brand images render');

const researchNav=window.document.querySelector('[data-nav="research"]');
researchNav?.click();
check(!window.document.querySelector('#researchHubView')?.classList.contains('hidden'),'research navigation opens V9 view');
check(!!window.document.querySelector('.v9-shell'),'V9 research shell renders');

const searchNav=window.document.querySelector('header [data-nav="search"]');
searchNav?.click();
const industrial=window.document.querySelector('[data-preset="industrial"]');
industrial?.click();
check(industrial?.classList.contains('active'),'industrial preset can be selected');
check(window.document.querySelectorAll('.engine-card.selected').length===4,'industrial preset selects four engines');

const firstEngine=window.document.querySelector('[data-engine="google"]');
firstEngine?.click();
check(window.document.querySelectorAll('.engine-card.selected').length===3,'engine selection toggles through delegated handler');

const quick=window.document.querySelector('[data-open-engine="google"]');
check(quick?.tagName==='BUTTON','single-engine quick action is a button, not a raw link');
check(!window.document.querySelector('.engine-open[href]'),'no engine quick action bypasses preparation');

const groupClear=window.document.querySelector('[data-group-clear="通用"]');
groupClear?.click();
check(window.document.querySelectorAll('.engine-card.selected').length<=3,'group clear changes selection without runtime error');

check(!!window.SOUTU_BRIDGE,'main/V9 bridge is exposed');
check(typeof window.SOUTU_BRIDGE?.setView==='function','bridge navigation API exists');

if(failures.length){
  console.error('DOM QA failed:');
  failures.forEach(x=>console.error('✗',x));
  process.exit(1);
}
console.log('Soutu Pro DOM runtime QA passed');
