function json(res,status,body,maxAge=3600){
  res.setHeader('Cache-Control',`s-maxage=${maxAge}, stale-while-revalidate=${maxAge*6}`);
  return res.status(status).json(body);
}

const ISO=/^[A-Z]{3}$/;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function fetchRates(url){
  let lastError=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const upstream=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(4000)});
      const data=await upstream.json().catch(()=>null);
      if(!upstream.ok||!Array.isArray(data))throw new Error(data?.message||`FX provider returned ${upstream.status}`);
      return data;
    }catch(error){
      lastError=error;
      if(attempt<2)await sleep(180);
    }
  }
  throw lastError||new Error('Exchange-rate provider failed');
}

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{enabled:false,message:'Method not allowed'},60);
  const base=String(req.query?.base||'USD').trim().toUpperCase();
  const quotes=String(req.query?.quotes||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
  if(!ISO.test(base))return json(res,400,{enabled:false,message:'Invalid base currency'},60);
  if(quotes.length>20||quotes.some(q=>!ISO.test(q)))return json(res,400,{enabled:false,message:'Invalid quote currencies'},60);
  const unique=[...new Set(quotes.filter(q=>q!==base))].sort();
  if(!unique.length)return json(res,200,{enabled:true,provider:'Frankfurter',base,date:'',rates:{[base]:1}});
  try{
    const url=new URL('https://api.frankfurter.dev/v2/rates');
    url.searchParams.set('base',base.toLowerCase());
    url.searchParams.set('quotes',unique.map(q=>q.toLowerCase()).join(','));
    const data=await fetchRates(url);
    const rates={[base]:1};let date='';
    for(const row of data){
      const quote=String(row?.quote||'').toUpperCase(),rate=Number(row?.rate);
      if(ISO.test(quote)&&Number.isFinite(rate)&&rate>0){rates[quote]=rate;if(!date&&row?.date)date=String(row.date)}
    }
    const missing=unique.filter(q=>!(rates[q]>0));
    return json(res,200,{enabled:true,provider:'Frankfurter',base,date,rates,missing});
  }catch(error){
    return json(res,502,{enabled:false,provider:'Frankfurter',message:error?.message||'Exchange-rate provider failed'},15);
  }
}
