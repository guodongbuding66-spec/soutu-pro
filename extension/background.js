const DEFAULT_SITE='https://soutu-pro.vercel.app/';
chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.removeAll(()=>{
    const items=[
      ['soutu-product','搜图 Pro · 商品找同款','image'],['soutu-source','搜图 Pro · 找原图来源','image'],['soutu-hd','搜图 Pro · 找高清版本','image'],['soutu-industrial','搜图 Pro · 工业结构找同款','image'],['soutu-supplier','搜图 Pro · 反查供应商','image'],['soutu-page-collect','搜图 Pro · 采集当前页面','page']
    ];
    items.forEach(([id,title,context])=>chrome.contextMenus.create({id,title,contexts:[context]}));
  });
});
chrome.contextMenus.onClicked.addListener(async(info,tab)=>{
  const {siteUrl=DEFAULT_SITE}=await chrome.storage.sync.get('siteUrl');
  if(info.menuItemId==='soutu-page-collect'){chrome.action.openPopup?.();return}
  if(!info.srcUrl)return;
  const map={'soutu-source':'source','soutu-hd':'hd','soutu-industrial':'industrial'};
  const preset=map[info.menuItemId]||'product';
  const u=new URL(siteUrl);u.searchParams.set('image',info.srcUrl);u.searchParams.set('preset',preset);
  if(info.menuItemId==='soutu-supplier')u.searchParams.set('mode','supplier');
  chrome.tabs.create({url:u.toString()});
});