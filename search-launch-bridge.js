/* Native search links: resolve current image URLs in the workbench, navigate only the new tab. */
(function(){
  'use strict';
  const validId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
  function id(){return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('')}
  function transport(ticket,onMessage){
    if(!validId(ticket))throw new Error('搜索任务无效');
    const name=`soutu-search-launch-${ticket}`;
    if(typeof BroadcastChannel==='function'){
      const channel=new BroadcastChannel(name);
      channel.onmessage=event=>onMessage(event.data);
      return{post:data=>channel.postMessage(data),close:()=>channel.close()};
    }
    // Storage events support older browsers without storing images or workbench records.
    const listener=event=>{if(event.key!==name||!event.newValue)return;try{onMessage(JSON.parse(event.newValue).data)}catch{}};
    addEventListener('storage',listener);
    return{post:data=>{localStorage.setItem(name,JSON.stringify({nonce:id(),data}));localStorage.removeItem(name)},close:()=>removeEventListener('storage',listener)};
  }
  let queue=Promise.resolve();
  const registrations=new Set();
  function arm(link,resolve,onState=()=>{}){
    for(const close of registrations)if(!close.link.isConnected)close();
    link.__searchLaunch?.();
    const ticket=id(),attempts=new Map();
    let busy=0,closed=false;
    const channel=transport(ticket,message=>{
      if(closed||message?.type!=='request'||!validId(message.attempt))return;
      const attempt=message.attempt;
      if(attempts.has(attempt)){channel.post(attempts.get(attempt));return}
      const accepted={type:'accepted',attempt};attempts.set(attempt,accepted);channel.post(accepted);
      busy++;onState('preparing');
      const task=queue.then(async()=>{
        let result;
        try{
          const target=new URL(await resolve());
          if(!['http:','https:'].includes(target.protocol))throw new Error('搜索地址无效');
          result={type:'target',attempt,url:target.href};onState('opened');
        }catch(error){result={type:'error',attempt,message:error?.message||'图片链接准备失败，请重试。'};onState('error',result.message)}
        attempts.set(attempt,result);
        try{if(!closed)channel.post(result)}finally{busy--;if(attempts.size>16)attempts.delete(attempts.keys().next().value);if(!link.isConnected)close()}
      });
      queue=task.catch(()=>{});
    });
    const close=()=>{if(busy)return;closed=true;channel.close();clearTimeout(expiry);registrations.delete(close)};
    const expiry=setTimeout(close,60*60*1000);
    close.link=link;registrations.add(close);link.__searchLaunch=close;
    const url=new URL('./search-launch.html',location.href);url.hash=ticket;
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
  }
  addEventListener('pagehide',()=>{for(const close of registrations)close()});
  window.SOUTU_SEARCH_LAUNCH={arm,transport,id,validId};
})();
