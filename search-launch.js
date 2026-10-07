(function(){
  'use strict';
  const api=window.SOUTU_SEARCH_LAUNCH,ticket=location.hash.slice(1);
  let channel,retryTimer,deadlineTimer,finished=false;
  function cleanup(){clearInterval(retryTimer);clearTimeout(deadlineTimer);channel?.close()}
  function fail(message){if(finished)return;finished=true;cleanup();document.getElementById('spinner').hidden=true;document.getElementById('title').textContent='搜索暂未打开';document.getElementById('message').textContent=message;document.getElementById('actions').hidden=false}
  document.getElementById('retry').href=location.href;
  document.getElementById('retry').onclick=event=>{event.preventDefault();location.reload()};
  if(!api?.validId(ticket)){fail('搜索任务无效，请返回搜图页面重新点击引擎。');return}
  const attempt=api.id();
  try{
    channel=api.transport(ticket,message=>{
      if(finished||message?.attempt!==attempt)return;
      if(message.type==='accepted'){clearInterval(retryTimer);document.getElementById('message').textContent='正在校验图片链接，完成后会自动前往搜索引擎…';return}
      if(message.type==='error'){fail(message.message||'图片链接准备失败，请重试。');return}
      if(message.type==='target'){
        try{const target=new URL(message.url);if(!['https:','http:'].includes(target.protocol))throw new Error();location.replace(target.href);finished=true;cleanup()}catch{fail('搜索地址无效，请返回搜图页面重试。')}
      }
    });
    const request=()=>{try{channel.post({type:'request',attempt})}catch{fail('无法连接原搜图页面，请返回后重试。')}};
    retryTimer=setInterval(request,300);
    deadlineTimer=setTimeout(()=>fail('准备超时，请确认原搜图页面仍然打开，再重试。'),120000);
    request();
  }catch{fail('无法连接原搜图页面，请返回后重试。')}
  addEventListener('pagehide',cleanup,{once:true});
})();
