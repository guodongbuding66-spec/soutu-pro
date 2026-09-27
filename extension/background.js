const DEFAULT_SITE='https://soutu-pro.netlify.app/';
chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.create({id:'soutu-product',title:'搜图 Pro · 商品找同款',contexts:['image']});
  chrome.contextMenus.create({id:'soutu-source',title:'搜图 Pro · 找原图来源',contexts:['image']});
  chrome.contextMenus.create({id:'soutu-all',title:'搜图 Pro · 全部搜索',contexts:['image']});
});
chrome.contextMenus.onClicked.addListener(async(info)=>{
  if(!info.srcUrl)return;const {siteUrl=DEFAULT_SITE}=await chrome.storage.sync.get('siteUrl');
  const preset=info.menuItemId==='soutu-source'?'source':info.menuItemId==='soutu-all'?'all':'product';
  const u=new URL(siteUrl);u.searchParams.set('image',info.srcUrl);u.searchParams.set('preset',preset);chrome.tabs.create({url:u.toString()});
});