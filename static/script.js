const TICKERS = ['SPY','QQQ','GLD'];
const sel = {SPY:[],QQQ:[],GLD:[]};
const symCls = {SPY:'',QQQ:'Q',GLD:'G'};

const CFG = {
  displayModeBar:true, displaylogo:false, responsive:true, scrollZoom:true,
  modeBarButtons:[['zoomIn2d','zoomOut2d','autoScale2d','resetScale2d','pan2d']]
};

function fmt(n){
  if(n==null) return '--';
  const a=Math.abs(n);
  const s=a>=1e9?(n/1e9).toFixed(2)+'B':a>=1e6?(n/1e6).toFixed(2)+'M':a>=1e3?(n/1e3).toFixed(2)+'K':n.toFixed(2);
  return (n>=0?'+':'')+s;
}
function setEl(id,v){const e=document.getElementById(id);if(e)e.innerText=v;}

async function loadExpiries(sym){
  const row=document.getElementById('e'+sym);
  try{
    const r=await fetch('/api/expiries?ticker='+sym);
    const d=await r.json();
    const list=d.expiries||[];
    if(!list.length){row.innerHTML='<span style="color:#222;font-size:10px">No expiries found</span>';return;}
    row.innerHTML='';
    list.forEach(item=>{
      const chip=document.createElement('div');
      chip.className='chip'+(symCls[sym]?' '+symCls[sym]:'');
      chip.dataset.exp=item.expiry;
      const oiStr=item.oi>0?Math.round(item.oi/1000)+'K OI':'-- OI';
      chip.innerHTML=`<span class="cd">${item.date}</span><span class="cs">${item.weekday} · ${oiStr}</span>`;
      chip.addEventListener('click',()=>{
        chip.classList.toggle('on');
        if(chip.classList.contains('on')){
          if(!sel[sym].includes(item.expiry)) sel[sym].push(item.expiry);
        } else {
          sel[sym]=sel[sym].filter(e=>e!==item.expiry);
        }
      });
      row.appendChild(chip);
    });
  }catch(e){
    row.innerHTML='<span style="color:#222;font-size:10px">Load failed</span>';
    console.error('expiries',sym,e);
  }
}

function renderChart(sym,data){
  const spot=data.spot;
  const lo=spot*0.96, hi=spot*1.04;
  const strikes=data.strikes;
  const gex=data.gex;
  const dex=data.dex;
  const cumGex=data.cumulative_gex.map(p=>p.value);
  const cumDex=data.cumulative_dex.map(p=>p.value);
  const gCol=gex.map(v=>v>=0?'rgba(57,255,20,0.45)':'rgba(255,49,49,0.45)');
  const dCol=dex.map(v=>v>=0?'rgba(57,255,20,0.45)':'rgba(255,49,49,0.45)');
  const hov=strikes.map((_,i)=>
    `<b>Strike: ${strikes[i]}</b><br>`+
    `GEX: ${fmt(gex[i])}<br>`+
    `Cum GEX: ${fmt(cumGex[i])}<br>`+
    `DEX: ${fmt(dex[i])}<br>`+
    `Cum DEX: ${fmt(cumDex[i])}`+
    `<extra></extra>`
  );

  const traces=[
    {name:'GEX Bars', x:strikes, y:gex, type:'bar', marker:{color:gCol}, bargap:0.35,
     yaxis:'y', xaxis:'x', hovertemplate:hov, showlegend:true},
    {name:'Cum GEX', x:strikes, y:cumGex, type:'scatter', mode:'lines',
     line:{color:'#00FFFF',width:3,shape:'spline',smoothing:0.5},
     yaxis:'y3', xaxis:'x', hovertemplate:hov, showlegend:true},
    {name:'DEX Bars', x:strikes, y:dex, type:'bar', marker:{color:dCol}, bargap:0.35,
     yaxis:'y2', xaxis:'x', hovertemplate:hov, showlegend:true},
    {name:'Cum DEX', x:strikes, y:cumDex, type:'scatter', mode:'lines',
     line:{color:'#FFFF00',width:3,shape:'spline',smoothing:0.5},
     yaxis:'y4', xaxis:'x', hovertemplate:hov, showlegend:true}
  ];

  const layout={
    paper_bgcolor:'#000', plot_bgcolor:'#000',
    height:520,
    title:{
      text:`<b style="font-family:'Courier New'">${sym} FLOW ENGINE</b>`+
           `<br><span style="font-size:9px;color:#2a2a2a;font-family:'Courier New'">Spot: ${spot} &nbsp;|&nbsp; Call Wall: ${data.call_wall} &nbsp;|&nbsp; Put Wall: ${data.put_wall} &nbsp;|&nbsp; Flip: ${data.flip_point} &nbsp;|&nbsp; ${data.updated}</span>`,
      font:{size:12,color:'#fff',family:'Courier New'},
      x:0.5, xanchor:'center'
    },
    bargap:0.35,
    yaxis:{domain:[0.54,1.0], showgrid:false,
      zeroline:true, zerolinecolor:'rgba(255,255,255,0.06)', zerolinewidth:1,
      tickfont:{size:9,color:'#2a2a2a',family:'Courier New'},
      title:{text:'GEX',font:{color:'#39FF14',size:9,family:'Courier New'}}},
    yaxis2:{domain:[0,0.46], showgrid:false,
      zeroline:true, zerolinecolor:'rgba(255,255,255,0.06)', zerolinewidth:1,
      tickfont:{size:9,color:'#2a2a2a',family:'Courier New'},
      title:{text:'DEX',font:{color:'#39FF14',size:9,family:'Courier New'}}},
    yaxis3:{domain:[0.54,1.0], overlaying:'y', side:'right',
      showgrid:false, zeroline:false, showticklabels:false},
    yaxis4:{domain:[0,0.46], overlaying:'y2', side:'right',
      showgrid:false, zeroline:false, showticklabels:false},
    xaxis:{range:[lo,hi], showgrid:false, zeroline:false,
      tickfont:{size:8,color:'#333',family:'Courier New'}, tickangle:-45},
    legend:{orientation:'h', x:0.5, xanchor:'center', y:1.07, yanchor:'bottom',
      font:{color:'#444',size:9,family:'Courier New'}, bgcolor:'rgba(0,0,0,0)'},
    hovermode:'x unified',
    shapes:[
      {type:'line', xref:'x', yref:'paper', x0:spot, x1:spot, y0:0, y1:1,
       line:{color:'#FFFFFF',width:2,dash:'solid'}},
      {type:'line', xref:'x', yref:'paper', x0:data.call_wall, x1:data.call_wall, y0:0, y1:1,
       line:{color:'#FFDD00',width:2,dash:'dash'}},
      {type:'line', xref:'x', yref:'paper', x0:data.put_wall, x1:data.put_wall, y0:0, y1:1,
       line:{color:'#FF3300',width:2,dash:'dash'}}
    ],
    annotations:[
      {xref:'x', yref:'paper', x:spot, y:0.99, text:'SPOT', showarrow:false,
       font:{color:'#FFFFFF',size:7,family:'Courier New'}, xanchor:'left'},
      {xref:'x', yref:'paper', x:data.call_wall, y:0.93, text:'CALL WALL', showarrow:false,
       font:{color:'#FFDD00',size:7,family:'Courier New'}, xanchor:'left'},
      {xref:'x', yref:'paper', x:data.put_wall, y:0.87, text:'PUT WALL', showarrow:false,
       font:{color:'#FF3300',size:7,family:'Courier New'}, xanchor:'left'}
    ],
    margin:{l:44,r:44,t:78,b:44},
    dragmode:'pan'
  };

  Plotly.newPlot('c'+sym, traces, layout, CFG);
}

async function loadChart(sym){
  const div=document.getElementById('c'+sym);
  if(!sel[sym].length){
    div.innerHTML='<div class="cempty">Select expiries above → tap REFRESH ALL</div>';
    return;
  }
  div.innerHTML='<div class="cload">LOADING '+sym+'...</div>';
  try{
    const r=await fetch(`/api/gex?ticker=${sym}&expiries=${sel[sym].join(',')}`);
    const data=await r.json();
    if(data.error){
      div.innerHTML=`<div class="cempty">${data.error}</div>`;
      return;
    }
    setEl('p'+sym,'$'+data.spot);
    setEl('cw'+sym, data.call_wall);
    setEl('pw'+sym, data.put_wall);
    const ng=document.getElementById('ng'+sym);
    if(ng){ng.innerText=fmt(data.net_gex);ng.className='sv '+(data.net_gex>=0?'g':'r');}
    const nd=document.getElementById('nd'+sym);
    if(nd){nd.innerText=fmt(data.net_dex);nd.className='sv '+(data.net_dex>=0?'g':'r');}
    setEl('fp'+sym, data.flip_point);
    setEl('mp'+sym, data.max_pain);
    setEl('tsMain', data.updated);
    renderChart(sym, data);
  }catch(e){
    div.innerHTML='<div class="cempty">Error — tap REFRESH ALL to retry</div>';
    console.error(sym,e);
  }
}

async function loadAll(){
  const btn=document.getElementById('btnAll');
  btn.disabled=true; btn.innerText='⟳ LOADING...';
  await Promise.all(TICKERS.map(t=>loadChart(t)));
  btn.disabled=false; btn.innerText='⟳ REFRESH ALL';
}

async function init(){
  try{
    const r=await fetch('/api/quotes');
    const d=await r.json();
    TICKERS.forEach(t=>{if(d.quotes[t]) setEl('p'+t,'$'+d.quotes[t]);});
  }catch(e){}
  await Promise.all(TICKERS.map(t=>loadExpiries(t)));
}

init();
