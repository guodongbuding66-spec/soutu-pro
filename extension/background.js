importScripts('collector.js');
const DEFAULT_SITE='https://soutu-pro.vercel.app/';
chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.removeAll(()=>{
    const items=[
      ['soutu-product','搜图 Pro · 商品找同款','image'],['soutu-source','搜图 Pro · 找原图来源','image'],['soutu-hd','搜图 Pro · 找高清版本','image'],['soutu-industrial','搜图 Pro · 工业结构找同款','image'],['soutu-supplier','搜图 Pro · 反查供应商','image'],['soutu-page-collect','搜图 Pro · 采集当前页面','page']
    ];
    items.forEach(([id,title,context])=>chrome.contextMenus.create({id,title,contexts:[context]}));
  });
});
function base64url(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function collectCurrentPage(tab,siteUrl){
  if(!tab?.id)throw new Error('No active tab');
  const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:soutuCollectPage,args:['results']});
  if(!result?.results?.length)throw new Error('当前页面没有找到可采集结果');
  const u=new URL(siteUrl);u.hash=`collector=${base64url(result)}`;await chrome.tabs.create({url:u.toString()});
}
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  const {siteUrl=DEFAULT_SITE}=await chrome.storage.sync.get('siteUrl');
  if(info.menuItemId==='soutu-page-collect'){try{await collectCurrentPage(tab,siteUrl)}catch(e){console.warn('Soutu collector failed',e)}return}
  if(!info.srcUrl)return;
  const map={'soutu-source':'source','soutu-hd':'hd','soutu-industrial':'industrial'};
  const preset=map[info.menuItemId]||'product';
  const u=new URL(siteUrl);u.searchParams.set('image',info.srcUrl);u.searchParams.set('preset',preset);
  if(info.menuItemId==='soutu-supplier')u.searchParams.set('mode','supplier');
  chrome.tabs.create({url:u.toString()});
});