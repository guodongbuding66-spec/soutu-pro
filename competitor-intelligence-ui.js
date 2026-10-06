(()=>{
  'use strict';
  if(window.SOUTU_COMPETITOR_UI_MOUNTED)return;
  function mount(){
    if(document.querySelector('#competitorIntelligenceBtn')&&document.querySelector('#competitorIntelligencePanel')){window.SOUTU_COMPETITOR_UI_MOUNTED=true;return true}
    const actions=document.querySelector('#universalResearchbar .query-actions'),grid=document.querySelector('#marketplaceGrid');
    if(!actions||!grid)return false;
    if(!document.querySelector('#competitorIntelligenceBtn')){
      const button=document.createElement('button');button.type='button';button.className='secondary-btn compact';button.id='competitorIntelligenceBtn';button.innerHTML='<svg aria-hidden="true"><use href="#i-scan"/></svg>竞品情报';
      const anchor=document.querySelector('#universalIdentityGroupBtn')||document.querySelector('#universalProvenanceBtn');
      anchor?.insertAdjacentElement('afterend',button)||actions.appendChild(button)
    }
    if(!document.querySelector('#competitorIntelligencePanel')){
      const panel=document.createElement('div');panel.id='competitorIntelligencePanel';panel.className='competitor-intelligence-panel hidden';panel.setAttribute('aria-live','polite');grid.insertAdjacentElement('beforebegin',panel)
    }
    window.SOUTU_COMPETITOR_UI_MOUNTED=true;return true
  }
  if(!mount()){
    const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),10000)
  }
  window.SOUTU_COMPETITOR_UI={mount};
})();