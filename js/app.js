/* Месте4ко · app.js — фото, фильтры, журнал-сетка, карта, окна */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CK=(typeof CITY!=='undefined'&&CITY.slug)?('m4.'+CITY.slug):'m4';
const EDITOR=(typeof CITY!=='undefined'&&CITY.editor)||'Редакция Месте4ко';
const ISSUE=(typeof CITY!=='undefined'&&CITY.date)||'19 ноября 2026';
const S={q:'',tag:'all',company:'any',mood:'any',budget:'any',weather:'any',open:false,savedOnly:false,sort:'rec',col:null,
  saved:new Set(store.get(CK+'.saved',[])),reports:store.get(CK+'.reports',{})};
let currentId=null,toastTimer=null,toastHide=null,lastRemoved=null;
const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const fmtDate=iso=>{const d=new Date(iso+'T12:00:00');return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()};
const fmtShort=iso=>{const d=new Date(iso+'T12:00:00');return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')};
function plural(n,f){const m=n%100;if(m>=11&&m<=14)return f[2];const k=n%10;return k===1?f[0]:k>=2&&k<=4?f[1]:f[2]}
const pw=n=>plural(n,['место','места','мест']);
function openNow(p){
  if(p.hours==='24')return true;
  if(p.hours==='afisha')return null;
  const n=new Date(),day=n.getDay(),h=n.getHours()+n.getMinutes()/60,{o,c,off=[]}=p.hours;
  if(off.includes(day))return false;
  if(c===24)return h>=o;
  if(c<=o)return h>=o||h<c;
  return h>=o&&h<c;
}
const isLate=p=>p.hours==='24'||(p.hours!=='afisha'&&(p.hours.c===24||p.hours.c<=p.hours.o||p.hours.c>22));
const openBadge=p=>{const o=openNow(p);return o===true?'<span class="pill o">Открыто</span>':o===null?'<span class="pill o afisha">По афише</span>':'<span class="pill o closed">Закрыто</span>'};
const recheck=p=>!!S.reports[p.id];
const stamp=p=>p.draft?'<span class="stamp recheck">Черновик</span>':recheck(p)?'<span class="stamp recheck">На проверке</span>':`<span class="stamp">Проверено ${fmtShort(p.checked)}</span>`;
const budgetLabel=p=>p.budget&&p.budget[1]===0?'Бесплатно':p.budgetText;
const mapUrl=p=>`https://yandex.ru/maps/?pt=${p.lng},${p.lat}&z=17&l=map`;
const placeRoute=p=>`https://yandex.ru/maps/?rtext=~${p.lat},${p.lng}`;
const catOf=p=>CAT[p.cat]||CAT['Погулять'];

/* фото: Wikipedia / Wikimedia Commons */
const WIKI=(typeof CITY!=='undefined'&&CITY.wiki)||{naberezhnaya:['Михайловская набережная'],zaeltsovsky:['Заельцовский парк'],bugrinskaya:['Бугринская роща'],narymsky:['Нарымский сквер'],centralpark:['Центральный парк (Новосибирск)'],novat:['Новосибирский театр оперы и балета'],fakel:['Красный факел (театр)'],zoo:['Новосибирский зоопарк'],kukolny:['Новосибирский областной театр кукол'],delfinia:['Дельфиния'],planetarium:['Новосибирский планетарий'],aquamir:['Аквамир'],gpntb:['Государственная публичная научно-техническая библиотека СО РАН'],aura:['Аура (торговый центр)'],tochka:['Академпарк']};
const HERO_T=(typeof CITY!=='undefined'&&CITY.hero)||['Михайловская набережная','Бугринский мост'],CITY_T=(typeof CITY!=='undefined'&&CITY.city)||['Новосибирск'];
const Photo={pending:true,hero:{name:'Вдоль Оби',cat:'Местный маршрут'},city:{name:'Новосибирск',cat:'Город'}};
const stripHtml=v=>String(v==null?'':v).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const chunk=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o};
async function api(params){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),9000);
  try{const r=await fetch('https://ru.wikipedia.org/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',origin:'*',...params}),{signal:ctl.signal});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}
}
async function resolvePhotos(){
  const titles=[...new Set([...Object.values(WIKI).flat(),...HERO_T,...CITY_T])],found={};
  for(const part of chunk(titles,8)){
    const j=await api({action:'query',redirects:'1',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'900',titles:part.join('|')});
    const q=j.query||{},alias={};
    (q.normalized||[]).forEach(n=>alias[n.from]=n.to);(q.redirects||[]).forEach(n=>alias[n.from]=n.to);
    const follow=t=>{let x=t,i=0;while(alias[x]&&i++<6)x=alias[x];return x};
    const by={};(q.pages||[]).forEach(p=>{if(p&&p.thumbnail)by[p.title]={src:p.thumbnail.source,file:p.pageimage||''}});
    part.forEach(t=>{const h=by[follow(t)];if(h)found[t]=h});
  }
  const files=[...new Set(Object.values(found).map(v=>v.file).filter(Boolean))],meta={};
  for(const part of chunk(files,8)){
    try{
      const j=await api({action:'query',prop:'imageinfo',iiprop:'url|extmetadata',titles:part.map(f=>'File:'+f).join('|')});
      ((j.query||{}).pages||[]).forEach(p=>{const ii=(p.imageinfo||[])[0];if(!ii)return;const em=ii.extmetadata||{};
        meta[p.title.replace(/^File:/,'')]={author:stripHtml(em.Artist&&em.Artist.value)||'автор не указан',license:stripHtml(em.LicenseShortName&&em.LicenseShortName.value)||'свободная лицензия',page:ii.descriptionurl||'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(p.title.replace(/^File:/,''))}});
    }catch(e){}
  }
  const pick=list=>{for(const t of list){if(found[t]){const f=found[t];return{photo:f.src,credit:{...(meta[f.file]||{author:'автор не указан',license:'свободная лицензия',page:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(f.file)}),article:'https://ru.wikipedia.org/wiki/'+encodeURIComponent(t.replace(/ /g,'_'))}}}}return null};
  const out={places:{},hero:pick(HERO_T),city:pick(CITY_T)};
  PLACES.forEach(p=>{const h=pick(WIKI[p.id]||[]);if(h)out.places[p.id]=h});
  return out;
}
function applyPhotos(d){
  if(!d)return;
  PLACES.forEach(p=>{const h=d.places&&d.places[p.id];if(h){p.photo=h.photo;p.credit=h.credit}else{delete p.photo;delete p.credit}});
  if(d.hero){Photo.hero.photo=d.hero.photo;Photo.hero.credit=d.hero.credit}
  if(d.city){Photo.city.photo=d.city.photo;Photo.city.credit=d.city.credit}
}
function coverInner(p,eager){
  const c=catOf(p);
  const typo=`<span class="typo" style="--t1:${c.t};--t2:${c.t}"><span class="tk">${p.cat||''}</span><span class="tn">${p.name}</span><span class="tr" style="background:${c.c}"></span></span>`;
  return typo+(p.photo?`<img class="ph" src="${p.photo}" alt="" ${eager?'':'loading="lazy"'} decoding="async" onerror="this.remove()">`:'')+((!p.photo&&Photo.pending)?'<span class="skel"></span>':'')+'<span class="scrim"></span>';
}

/* фильтры */
function filtered(){
  let list=PLACES.filter(p=>{
    if(S.q){const hay=(p.name+' '+p.lead+' '+p.desc+' '+p.minus+' '+p.addr+' '+p.area+' '+p.cat+' '+p.feat.join(' ')).toLowerCase();if(!hay.includes(S.q.toLowerCase().trim()))return false}
    if(S.tag!=='all'&&!p.tags.includes(S.tag))return false;
    if(S.company!=='any'&&!p.company.includes(S.company))return false;
    if(S.mood!=='any'&&!p.mood.includes(S.mood))return false;
    if(S.budget==='free'&&!(p.budget&&p.budget[1]===0))return false;
    if(['500','1000','2000'].includes(S.budget)&&!(p.budget&&p.budget[1]<=+S.budget))return false;
    if(S.weather==='in'&&!p.indoor)return false;
    if(S.weather==='out'&&p.indoor)return false;
    if(S.open&&openNow(p)!==true)return false;
    if(S.savedOnly&&!S.saved.has(p.id))return false;
    if(S.col&&!colPred[S.col](p))return false;
    return true;
  });
  if(S.sort==='cheap')list=[...list].sort((a,b)=>(a.budget?a.budget[1]:1e9)-(b.budget?b.budget[1]:1e9));
  if(S.sort==='fresh')list=[...list].sort((a,b)=>b.checked.localeCompare(a.checked));
  if(S.sort==='name')list=[...list].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  return list;
}
function activeSummary(){
  const b=[];
  if(S.company!=='any')b.push(COMPANY[S.company]);
  if(S.mood!=='any')b.push(MOOD[S.mood]);
  if(S.budget!=='any')b.push(S.budget==='free'?'Бесплатно':'До '+S.budget+' ₽');
  if(S.weather!=='any')b.push(S.weather==='in'?'Под крышей':'На улице');
  if(S.open)b.push('Открыто сейчас');
  if(S.tag!=='all')b.push((CHIPS.find(c=>c.k===S.tag)||{}).n||'');
  if(S.q)b.push('«'+S.q+'»');
  return b.filter(Boolean).join(' · ');
}

/* журнал-сетка */
function heart(p){const on=S.saved.has(p.id);return `<button class="ibtn ${on?'saved':''}" data-save="${p.id}" type="button" aria-label="Сохранить ${p.name}" aria-pressed="${on}"><svg viewBox="0 0 20 20"><path d="M10 17s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 17 8c0 4.5-7 9-7 9z"/></svg></button>`}
function foot(p,route){return `<div class="foot">${stamp(p)}<span class="sp"></span>${heart(p)}<button class="ibtn" data-map="${p.id}" type="button" aria-label="Показать на карте"><svg viewBox="0 0 20 20"><path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z"/><circle cx="10" cy="8" r="2"/></svg></button>${route?`<a class="btn btn-red btn-sm" href="${placeRoute(p)}" target="_blank" rel="noopener" data-stop>Маршрут</a>`:''}</div>`}
function cardHtml(p,i){
  const shape=i===0&&p.shape!=='note'?'feature':(p.shape||'std');
  const c=catOf(p),open=`<article class="card c-${shape} rv" data-id="${p.id}" tabindex="0" role="button" aria-label="Подробнее: ${p.name}">`;
  if(shape==='note')return `${open}<div class="body" style="--nt:${c.t};--nc:${c.c==='#111A38'?'#111A38':c.c}">
    <div class="num">${String(i+1).padStart(2,'0')}</div><div class="rule"></div>
    <div class="area">${p.cat} · ${p.area}</div><h3>${p.name}</h3><p class="lead">${p.lead}</p>
    <div class="pills"><span class="pill b">${budgetLabel(p)}</span>${openBadge(p)}</div>${foot(p,false)}</div></article>`;
  if(shape==='tall')return `${open}<div class="cover">${coverInner(p)}<span class="cat-tag">${p.cat}</span>
    <div class="on-img"><span class="k">${p.area} район</span><h3>${p.name}</h3></div></div>
    <div class="body"><p class="lead">${p.lead}</p><div class="minus"><b>Минус</b> ${p.minus}</div>
    <div class="pills"><span class="pill b">${budgetLabel(p)}</span><span class="pill t">${p.best}</span>${openBadge(p)}</div>${foot(p,false)}</div></article>`;
  if(shape==='mini')return `${open}<div class="cover">${coverInner(p)}</div>
    <div class="body"><div class="area">${p.cat}</div><h3>${p.name}</h3><p class="lead">${p.lead}</p>
    <div class="pills"><span class="pill b">${budgetLabel(p)}</span>${openBadge(p)}</div>${foot(p,false)}</div></article>`;
  const big=shape==='feature';
  return `${open}<div class="cover">${coverInner(p,big)}<span class="cat-tag">${p.cat}</span></div>
    <div class="body"><div class="area">${p.area} район</div><h3>${p.name}</h3><p class="lead">${big?p.desc:p.lead}</p>
    ${shape!=='std'?`<div class="minus"><b>Минус</b> ${p.minus}</div>`:''}
    <div class="pills"><span class="pill b">${budgetLabel(p)}</span><span class="pill t">${p.best}</span>${openBadge(p)}</div>
    ${big?`<div class="area">${p.feat.join(' · ')}</div>`:''}${foot(p,big||shape==='wide')}</div></article>`;
}
function render(){
  const list=filtered();
  var _sig=[S.q,S.tag,S.company,S.mood,S.budget,S.weather,S.open,S.savedOnly,S.sort,S.col].join('|');
  if(window.__m4Sig!==_sig){window.__m4Sig=_sig;window.__m4Limit=18;}
  $('#countLine').textContent=list.length+' '+pw(list.length);
  $('#activeHint').textContent=activeSummary();
  var _lim=(window.__m4Limit||18),_shown=list.slice(0,_lim);$('#grid').innerHTML=list.length?_shown.map(cardHtml).join('')+(_lim<list.length?'<div class="more-wrap"><button class="btn btn-line" id="moreBtn" type="button">Показать ещё '+Math.min(18,list.length-_lim)+' · осталось '+(list.length-_lim)+'</button></div>':''):`<div class="empty"><b>Пусто</b>Под эти условия ничего нет.<br><br><button class="btn btn-line" id="emptyReset" type="button">Сбросить фильтры</button></div>`;
  const er=$('#emptyReset');if(er)er.addEventListener('click',()=>{resetAll();toast('Фильтры сброшены')});
  var _mb=document.getElementById('moreBtn');if(_mb)_mb.addEventListener('click',function(){window.__m4Limit=(window.__m4Limit||18)+18;render();});
  const bn=$('#banner');
  if(S.col){const c=COLS.find(x=>x.k===S.col);bn.classList.add('show');$('#bannerName').textContent=c.n;$('#bannerMeta').textContent=EDITOR+' · '+ISSUE+' · '+list.length+' '+pw(list.length)}
  else if(S.savedOnly){bn.classList.add('show');$('#bannerName').textContent='Сохранённое';$('#bannerMeta').textContent=list.length+' '+pw(list.length)}
  else bn.classList.remove('show');
  $$('.seg').forEach(g=>{const k=g.dataset.group;$$('button',g).forEach(b=>b.classList.toggle('on',b.dataset.val===String(S[k])))});
  $('#openTgl').classList.toggle('on',S.open);$('#openTgl').setAttribute('aria-pressed',String(S.open));
  $('#savedBtn').classList.toggle('on',S.savedOnly);$('#savedBtn').setAttribute('aria-pressed',String(S.savedOnly));var _st=document.getElementById('savedTgl');if(_st){_st.classList.toggle('on',S.savedOnly);_st.setAttribute('aria-pressed',String(S.savedOnly));}
  $('#sortSel').value=S.sort;
  $$('#chips .chip').forEach(b=>{const k=b.dataset.chip;
    const on=(k==='open'&&S.open)||(k==='warm'&&S.weather==='in')||(k==='free'&&S.budget==='free')||(k==='kids'&&S.company==='kids')||(k==='two'&&S.company==='two')||(['eat','walk','work'].includes(k)&&S.tag===k);
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
  syncMap(list);observeRv();
}
function renderChips(){$('#chips').innerHTML=CHIPS.map(c=>`<button class="chip" data-chip="${c.k}" type="button" aria-pressed="false"><svg viewBox="0 0 20 20">${c.ic}</svg>${c.n}</button>`).join('')}
function renderCols(){
  const f=COLS[0],n=PLACES.filter(colPred.today).length;
  $('#colFeatured').innerHTML=`<button class="col-feat rv" data-col="today" type="button"><div class="txt"><div class="k">Подборка выпуска</div><h3>${f.n}</h3><p>${f.d}</p>
    <div class="meta"><span>${EDITOR}</span><span>${ISSUE}</span></div><span class="cnt">${n} ${pw(n)} →</span></div>
    <div class="art">${coverInner(Photo.hero)}</div></button>`;
  const tint={duo:'var(--magenta-t)',kidsrain:'var(--blue-t)',work:'var(--violet-t)',free:'var(--teal-t)',cheap:'var(--amber-t)',unusual:'var(--lime-t)',late:'var(--red-t)'};
  const ic={duo:CHIPS[4].ic,kidsrain:CHIPS[3].ic,work:CHIPS[5].ic,free:CHIPS[6].ic,cheap:CHIPS[6].ic,unusual:CHIPS[1].ic,late:CHIPS[7].ic};
  $('#colGrid').innerHTML=COLS.slice(1).map(c=>{const n=PLACES.filter(colPred[c.k]).length;
    return `<button class="col rv" data-col="${c.k}" type="button"><span class="ic" style="background:${tint[c.k]}"><svg viewBox="0 0 20 20">${ic[c.k]}</svg></span>
      <h3>${c.n}</h3><p>${c.d}</p><div class="meta"><span>19.11</span><b>${n} ${pw(n)}</b></div></button>`}).join('');
}
function paintArt(){
  $('#routeArt').innerHTML=coverInner(Photo.hero,true);
  $('#suggestArt').innerHTML=coverInner(Photo.city);
  $('#rtCover').innerHTML='<button class="dlg-x" data-close type="button" aria-label="Закрыть">✕</button>'+coverInner(Photo.hero,true);
}
function renderSources(){
  const shot=PLACES.filter(p=>p.photo).length;
  $('#srcLead').textContent='Снимки из Wikipedia и Wikimedia Commons, свободные лицензии. Найдено '+shot+' из '+PLACES.length+' мест. Остальные снимем сами.';
  $('#srcList').innerHTML=PLACES.map((p,i)=>p.photo&&p.credit?
    `<li><img class="th" src="${p.photo}" alt="" loading="lazy" onerror="this.remove()"><div><b>${p.name}</b><span>${p.credit.author} · ${p.credit.license}${p.credit.note?' · '+p.credit.note:''}</span><a href="${p.credit.page}" target="_blank" rel="noopener">Источник</a></div></li>`:
    `<li><span class="n">${i+1}</span><div><b>${p.name}</b><span>Фото ещё нет</span></div></li>`).join('');
}
function saveState(){store.set(CK+'.saved',[...S.saved]);store.set(CK+'.reports',S.reports);$('#savedCount').textContent=S.saved.size}

/* карта */
const M={map:null,layer:null,markers:{},me:null,ready:false};
function initMap(){
  const box=$('#cityMap');if(!box)return;
  if(typeof L==='undefined'){
    box.innerHTML=`<div class="map-fallback"><b>Карта не загрузилась</b><p style="font-size:14px;color:#3D4A70">Нет связи с сервером карт. Все места открываются по ссылкам ниже.</p><ul>${PLACES.map(p=>`<li><a href="${mapUrl(p)}" target="_blank" rel="noopener">${p.name} — на Яндекс Картах</a></li>`).join('')}</ul></div>`;
    $('#mapList').innerHTML='<div class="map-empty">Список мест доступен в разделе «Места».</div>';
    return;
  }
  M.map=L.map(box,{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView((typeof CITY!=='undefined'&&CITY.center)||[55.028,82.92],(typeof CITY!=='undefined'&&CITY.zoom)||12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19,attribution:'© OpenStreetMap, © CARTO'}).addTo(M.map);
  M.layer=(L.markerClusterGroup?L.markerClusterGroup({maxClusterRadius:46,disableClusteringAtZoom:16,spiderfyOnMaxZoom:true,showCoverageOnHover:false}):L.layerGroup()).addTo(M.map);M.ready=true;
  syncMap(filtered());fitMap();
}
function syncMap(list){
  if(!M.ready)return;
  M.layer.clearLayers();M.markers={};
  list.forEach((p,i)=>{
    const c=catOf(p);
    const icon=L.divIcon({className:'pin'+(c.dark?' dark':''),html:`<span style="--c:${c.c}"><i>${i+1}</i></span>`,iconSize:[28,28],iconAnchor:[14,26]});
    const m=L.marker([p.lat,p.lng],{icon,title:p.name,riseOnHover:true}).addTo(M.layer);
    m.on('click',()=>openPlace(p.id));M.markers[p.id]=m;
  });
  $('#mapCount').textContent=list.length+' '+pw(list.length)+' на карте';
  $('#mapList').innerHTML=list.length?list.map((p,i)=>{const c=catOf(p);
    return `<button class="mrow" data-fly="${p.id}" type="button"><span class="dot${c.dark?' dark':''}" style="background:${c.c}">${i+1}</span><span><b>${p.name}</b><span>${p.cat} · ${budgetLabel(p)}</span></span></button>`}).join(''):'<div class="map-empty">Под эти условия мест нет.</div>';
}
function fitMap(){
  if(!M.ready)return;
  const ms=Object.values(M.markers);if(!ms.length)return;
  M.map.fitBounds(L.featureGroup(ms).getBounds().pad(.18),{animate:!reduced});
}
function flyToPlace(id){
  const p=PLACES.find(x=>x.id===id);if(!p)return;
  $('#map-sec').scrollIntoView({behavior:reduced?'auto':'smooth'});
  if(!M.ready)return;
  setTimeout(()=>{
    M.map.flyTo([p.lat,p.lng],16,{duration:reduced?0:.8});
    const el=M.markers[id]&&M.markers[id].getElement();
    if(el){el.classList.add('pulse');setTimeout(()=>el.classList.remove('pulse'),1900)}
  },reduced?0:420);
}

/* тост, сохранённое, окна */
function toast(msg,label,fn){
  const el=$('#toast'),b=$('#toastAct');clearTimeout(toastTimer);clearTimeout(toastHide);
  $('#toastText').textContent=msg;
  if(label){b.hidden=false;b.textContent=label;b.onclick=()=>{fn();hideToast()}}else{b.hidden=true;b.onclick=null}
  if(typeof el.showPopover==='function'){try{el.showPopover()}catch(e){}}
  el.classList.add('show');toastTimer=setTimeout(hideToast,3600);
}
function hideToast(){const el=$('#toast');el.classList.remove('show');clearTimeout(toastHide);toastHide=setTimeout(()=>{if(!el.classList.contains('show')&&typeof el.hidePopover==='function'){try{el.hidePopover()}catch(e){}}},280)}
function toggleSave(id){
  if(S.saved.has(id)){S.saved.delete(id);lastRemoved=id;saveState();render();toast('Убрано','Вернуть',()=>{S.saved.add(lastRemoved);saveState();render()})}
  else{S.saved.add(id);saveState();render();toast('Сохранено')}
  if(currentId===id&&$('#placeDlg').open)pdSave();
}
function pdSave(){const on=S.saved.has(currentId);$('#pdSave').textContent=on?'♥ Сохранено':'Сохранить';$('#pdSave').setAttribute('aria-pressed',String(on))}
function showDialog(d){if(!d.open)d.showModal();document.body.classList.add('lock')}
function openPlace(id){
  const p=PLACES.find(x=>x.id===id);if(!p)return;currentId=id;
  $('#pdCover').innerHTML='<button class="dlg-x" data-close type="button" aria-label="Закрыть">✕</button>'+coverInner(p,true);
  $('#pdCat').textContent=p.cat+' · '+p.area+' район';
  $('#pdName').textContent=p.name;$('#pdAddr').textContent=p.addr;$('#pdDesc').textContent=p.desc;
  $('#pdMinus').innerHTML='<b>Минус</b> '+p.minus;
  $('#pdTags').innerHTML=[...p.company.map(c=>`<span class="pill b">${COMPANY[c]||c}</span>`),...p.mood.map(m=>`<span class="pill t">${MOOD[m]}</span>`),`<span class="pill ${p.indoor?'o afisha':'o'}">${p.indoor?'Под крышей':'На улице'}</span>`,openBadge(p)].join('');
  $('#pdBudget').textContent=p.budgetText;$('#pdBest').textContent=p.best;$('#pdHours').textContent=p.hoursText;$('#pdFeat').textContent=p.feat.join(', ');
  const st=$('#pdStamp');
  if(p.draft){st.className='stamp recheck';st.textContent='Черновик'}else if(recheck(p)){st.className='stamp recheck';st.textContent='На проверке'}else{st.className='stamp';st.textContent='Проверено '+fmtDate(p.checked)}
  $('#pdSrc').innerHTML=p.src+(p.credit?` · <a href="${p.credit.page}" target="_blank" rel="noopener">фото: ${p.credit.license}</a>`:'');
  $('#pdRoute').href=placeRoute(p);$('#pdMap').href=mapUrl(p);pdSave();showDialog($('#placeDlg'));
}
function openReport(id){
  $('#rpPlace').innerHTML=PLACES.map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${p.name}</option>`).join('');
  $('#rpType').selectedIndex=0;$('#rpText').value='';
  if($('#placeDlg').open)$('#placeDlg').close();
  showDialog($('#reportDlg'));
}
function resetAll(){Object.assign(S,{q:'',tag:'all',company:'any',mood:'any',budget:'any',weather:'any',open:false,savedOnly:false,sort:'rec',col:null});$('#q').value='';render()}
const goPlaces=()=>$('#places').scrollIntoView({behavior:reduced?'auto':'smooth'});
function applyCol(k){resetAll();S.col=k;Object.assign(S,colApply[k]||{});render();goPlaces();setTimeout(fitMap,300)}

/* события */
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();S.q=$('#q').value;S.col=null;render();goPlaces()});
$('#q').addEventListener('input',e=>{S.q=e.target.value;S.col=null;render()});
$('#chips').addEventListener('click',e=>{
  const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.chip;S.col=null;
  if(k==='open')S.open=!S.open;
  else if(k==='warm')S.weather=S.weather==='in'?'any':'in';
  else if(k==='free')S.budget=S.budget==='free'?'any':'free';
  else if(k==='kids')S.company=S.company==='kids'?'any':'kids';
  else if(k==='two')S.company=S.company==='two'?'any':'two';
  else S.tag=S.tag===k?'all':k;
  render();goPlaces();
});
$$('.seg').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S[g.dataset.group]=b.dataset.val;S.col=null;render()}));
$('#openTgl').addEventListener('click',()=>{S.open=!S.open;S.col=null;render()});
$('#sortSel').addEventListener('change',e=>{S.sort=e.target.value;render()});
$('#resetBtn').addEventListener('click',()=>{resetAll();toast('Фильтры сброшены');fitMap()});
$('#bannerClear').addEventListener('click',()=>{S.col=null;S.savedOnly=false;render()});
$('#savedBtn').addEventListener('click',()=>{S.savedOnly=!S.savedOnly;S.col=null;render();goPlaces();if(S.savedOnly&&!S.saved.size)toast('Пока пусто — жми ♥ на карточке')});
$('#randomBtn').addEventListener('click',()=>{const l=filtered();if(!l.length){toast('Под эти условия ничего нет');return}const p=l[Math.floor(Math.random()*l.length)];openPlace(p.id);toast('Случайное: '+p.name)});
$('#mapFit').addEventListener('click',()=>{fitMap();toast('Показаны все метки')});
$('#mapGeo').addEventListener('click',()=>{
  if(!navigator.geolocation){toast('Браузер не отдаёт геолокацию');return}
  toast('Ищем тебя…');
  navigator.geolocation.getCurrentPosition(pos=>{
    const ll=[pos.coords.latitude,pos.coords.longitude];
    if(!M.ready){toast('Карта недоступна');return}
    if(M.me)M.map.removeLayer(M.me);
    M.me=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(M.map);
    M.map.flyTo(ll,14,{duration:reduced?0:.9});toast('Ты здесь');
  },()=>toast('Не удалось определить место'),{timeout:9000,maximumAge:60000});
});
document.addEventListener('click',e=>{
  const col=e.target.closest('[data-col]');if(col){applyCol(col.dataset.col);return}
  const sv=e.target.closest('[data-save]');if(sv){e.stopPropagation();toggleSave(sv.dataset.save);return}
  const mp=e.target.closest('[data-map]');if(mp){e.stopPropagation();flyToPlace(mp.dataset.map);return}
  const fl=e.target.closest('[data-fly]');if(fl){flyToPlace(fl.dataset.fly);return}
  if(e.target.closest('[data-stop]'))return;
  const card=e.target.closest('.card');if(card){openPlace(card.dataset.id);return}
  const cl=e.target.closest('[data-close]');if(cl){const d=cl.closest('dialog');if(d)d.close()}
});
document.addEventListener('keydown',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('card')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPlace(t.dataset.id)}});
$('#pdSave').addEventListener('click',()=>toggleSave(currentId));
$('#pdReport').addEventListener('click',()=>openReport(currentId));
$('#pdOnMap').addEventListener('click',()=>{$('#placeDlg').close();flyToPlace(currentId)});
$('#footReport').addEventListener('click',()=>openReport(PLACES[0].id));
$('#footSources').addEventListener('click',()=>{renderSources();showDialog($('#sourcesDlg'))});
$('#suggestOpen').addEventListener('click',()=>{$('#suggestForm').style.display='block';$('#suggestOk').classList.remove('show');showDialog($('#suggestDlg'))});
$('#routeOpen').addEventListener('click',()=>showDialog($('#routeDlg')));
$('#suggestForm').addEventListener('submit',e=>{
  e.preventDefault();const a=store.get(CK+'.suggests',[]);
  a.push({...Object.fromEntries(new FormData(e.target).entries()),at:new Date().toISOString()});store.set(CK+'.suggests',a);
  e.target.style.display='none';$('#suggestOk').classList.add('show');toast('Заявка принята');
});
$('#suggestAgain').addEventListener('click',()=>{$('#suggestOk').classList.remove('show');const f=$('#suggestForm');f.reset();f.style.display='block'});
$('#reportForm').addEventListener('submit',e=>{
  e.preventDefault();const id=$('#rpPlace').value,a=store.get(CK+'.reportList',[]);
  a.push({id,type:$('#rpType').value,text:$('#rpText').value,at:new Date().toISOString()});store.set(CK+'.reportList',a);
  S.reports[id]=true;saveState();$('#reportDlg').close();render();toast('Спасибо. Место на проверке');
});
$$('dialog').forEach(d=>{
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  d.addEventListener('close',()=>{if(!$$('dialog').some(x=>x.open))document.body.classList.remove('lock')});
});

/* движение */
let io;
function observeRv(){
  if(!('IntersectionObserver'in window)){$$('.rv').forEach(el=>el.classList.add('in'));return}
  if(!io)io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.05});
  $$('.rv:not(.in)').forEach(el=>io.observe(el));
}
const hd=$('#hd');let ticking=false;
addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{
  hd.classList.toggle('scrolled',scrollY>10);
  if(!reduced&&scrollY<900){$('#heroSun').style.translate='0 '+(scrollY*.16)+'px';$('#heroRiver').style.translate='0 '+(scrollY*.06)+'px'}
  ticking=false;})},{passive:true});
if('IntersectionObserver'in window){
  const sIO=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting)$$('[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===x.target.id))}),{rootMargin:'-40% 0px -55% 0px'});
  ['collections','places','map-sec','suggest'].forEach(id=>{const el=document.getElementById(id);if(el)sIO.observe(el)});
}
setInterval(()=>{if(!$$('dialog').some(d=>d.open))render()},60000);

/* старт */
$('#rtStops').innerHTML=ROUTE_STOPS.map((s,i)=>`<li><span class="n">${i+1}</span><div style="flex:1"><b>${s.n}</b><span>${s.d}</span></div><a href="https://yandex.ru/maps/?pt=${s.lng},${s.lat}&z=16&l=map" target="_blank" rel="noopener">На карте</a></li>`).join('');
$('#routeBuild').href=routeUrl;$('#rtBuild').href=routeUrl;
$('#legend').innerHTML=Object.entries(CAT).filter(([k])=>!['Местный маршрут','Город'].includes(k)).map(([k,v])=>`<span><i style="background:${v.c}"></i>${k}</span>`).join('');
const cached=store.get(CK+'.ph.v2',null);
if(cached&&cached.at&&Date.now()-cached.at<6048e5){applyPhotos(cached.data);Photo.pending=false}
renderChips();renderCols();paintArt();saveState();render();observeRv();initMap();
if(Photo.pending){
  resolvePhotos().then(async d=>{try{if(window.__m4Fill)await window.__m4Fill(d)}catch(e){}applyPhotos(d);Photo.pending=false;store.set(CK+'.ph.v2',{at:Date.now(),data});renderCols();paintArt();render();if($('#sourcesDlg').open)renderSources()})
  .catch(()=>{Photo.pending=false;renderCols();paintArt();render()});
}

/* ===== Выбор города ===== */
(function(){
  if(typeof CITY==='undefined'||!CITY.name)return;
  var CITIES=(window.M4_CITIES||[{name:'Новосибирск',folder:'',ready:true},{name:'Москва',folder:'moskva',ready:true},{name:'Красноярск',folder:'krasnoyarsk',ready:true}]);
  var cur=CITIES.filter(function(c){return c.name===CITY.name})[0]||CITIES[0];
  function href(t){var cf=cur.folder,tf=t.folder;if(tf===cf)return null;if(cf==='')return tf?tf+'/':'./';return tf?'../'+tf+'/':'../';}
  function go(t){store.set('m4.city',t.name);var h=href(t);if(h)location.href=h;}
  function ensureDlg(){var d=document.getElementById('cityDlg');if(d)return d;
    d=document.createElement('dialog');d.id='cityDlg';
    d.innerHTML='<div class="dlg-form"><h3>Выберите город</h3><p class="lead">Гид готов для трёх городов, остальные собираем. Откройте любой — увидите его статус.</p><input class="field" id="citySearch" type="search" placeholder="Найти город…" autocomplete="off"><div class="city-list" id="cityList"></div><div class="form-row"><button class="btn btn-line" type="button" id="cityClose">Закрыть</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('#cityClose').addEventListener('click',function(){d.close()});
    d.addEventListener('click',function(e){if(e.target===d)d.close()});
    d.addEventListener('close',function(){if(!document.querySelector('dialog[open]'))document.body.classList.remove('lock')});
    d.querySelector('#citySearch').addEventListener('input',function(){render(this.value)});
    return d;}
  function render(q){var list=document.getElementById('cityList');q=(q||'').trim().toLowerCase();
    var items=CITIES.filter(function(t){return !q||t.name.toLowerCase().indexOf(q)>=0});
    if(!items.length){list.innerHTML='<div class="city-empty">Ничего не нашлось</div>';return;}
    list.innerHTML=items.map(function(t){var isCur=t.name===CITY.name;var badge=t.ready?'<span class="cr-badge ready">готово</span>':'<span class="cr-badge soon">скоро</span>';
      if(isCur)return '<div class="city-row cur"><span class="cr-name">'+t.name+'</span><span class="cr-badge here">вы здесь</span></div>';
      return '<button class="city-row" type="button" data-city="'+t.name+'"><span class="cr-name">'+t.name+'</span>'+badge+'</button>';}).join('');
    var btns=list.querySelectorAll('[data-city]');
    for(var i=0;i<btns.length;i++){btns[i].addEventListener('click',function(){var nm=this.getAttribute('data-city');var t=CITIES.filter(function(c){return c.name===nm})[0];if(t)go(t);});}}
  function openList(){var d=ensureDlg();var s=d.querySelector('#citySearch');if(s)s.value='';render('');d.showModal();document.body.classList.add('lock');if(s)setTimeout(function(){s.focus()},50);}
  var sw=document.querySelector('.city-sw');
  if(sw){sw.innerHTML='';var b=document.createElement('button');b.className='city-pick';b.type='button';
    b.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z"/><circle cx="10" cy="8" r="2"/></svg><span class="cp-label">Ваш город</span><b>'+CITY.name+'</b>';
    b.addEventListener('click',openList);sw.appendChild(b);}
  var saved=store.get('m4.city',null);
  if(!saved){setTimeout(function(){var d=document.getElementById('cityConfirm');
    if(!d){d=document.createElement('dialog');d.id='cityConfirm';
      d.innerHTML='<div class="dlg-form"><h3>Ваш город — '+CITY.name+'?</h3><p class="lead">Мы покажем места, подборки и карту для этого города.</p><div class="form-row"><button class="btn btn-line" type="button" id="ccOther">Выбрать город</button><button class="btn btn-red" type="button" id="ccYes">Да, верно</button></div></div>';
      document.body.appendChild(d);
      d.querySelector('#ccYes').addEventListener('click',function(){store.set('m4.city',CITY.name);d.close()});
      d.querySelector('#ccOther').addEventListener('click',function(){store.set('m4.city',CITY.name);d.close();openList()});
      d.addEventListener('close',function(){if(!document.querySelector('dialog[open]'))document.body.classList.remove('lock')});}
    d.showModal();document.body.classList.add('lock');},600);}
})();

/* ===== Мобильная навигация и фильтры ===== */
(function(){
  if(!document.getElementById('mobileNav')){
    var nav=document.createElement('nav');
    nav.className='mnav';nav.id='mobileNav';nav.setAttribute('aria-label','Навигация');
    nav.innerHTML=
      '<a href="#places" class="mnav-i" data-nav="places"><svg viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span>Места</span></a>'+
      '<a href="#collections" class="mnav-i" data-nav="collections"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Подборки</span></a>'+
      '<a href="#map-sec" class="mnav-i" data-nav="map-sec"><svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg><span>Карта</span></a>'+
      '<button class="mnav-i" type="button" data-mn="saved"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg><span>Избранное</span></button>';
    document.body.appendChild(nav);
    var sv=nav.querySelector('[data-mn="saved"]');
    if(sv)sv.addEventListener('click',function(){var sb=document.getElementById('savedBtn');if(sb)sb.click();});
  }
  var grid=document.querySelector('.places-grid');
  var filters=document.querySelector('.filters');
  if(grid&&filters&&!document.getElementById('filtersToggle')){
    var btn=document.createElement('button');
    btn.className='filters-toggle';btn.id='filtersToggle';btn.type='button';
    btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Фильтры';
    grid.insertBefore(btn,filters);
    btn.addEventListener('click',function(){
      var open=filters.classList.toggle('open');
      btn.classList.toggle('on',open);
    });
  }
})();

/* ===== Высота шапки + ротация заголовка ===== */
(function(){
  var hd=document.getElementById('hd');
  function setH(){if(hd)document.documentElement.style.setProperty('--hd-h',hd.offsetHeight+'px');}
  setH();
  window.addEventListener('resize',setH);
  if('ResizeObserver'in window&&hd)new ResizeObserver(setH).observe(hd);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(setH);
  setTimeout(setH,400);
})();
(function(){
  if(window.__hlRot)return;window.__hlRot=1;
  var h1=document.querySelector('.hero h1');
  if(!h1)return;
  var phrases=['Куда идти сегодня','Куда двинем вечером','Где погулять','Куда сходить вдвоём','Где выпить кофе','Куда пойти с детьми'];
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  h1.innerHTML='<span class="hl-mark draw"><span class="hl-text">'+phrases[0]+'</span></span>';
  if(reduce)return;
  var i=0,timer=null;
  function tick(){
    i=(i+1)%phrases.length;
    var mark=h1.querySelector('.hl-mark'),txt=h1.querySelector('.hl-text');
    txt.classList.add('out');
    setTimeout(function(){
      txt.textContent=phrases[i];
      mark.classList.remove('draw');void mark.offsetWidth;mark.classList.add('draw');
      txt.classList.remove('out');
    },240);
  }
  function start(){if(!timer)timer=setInterval(tick,4200);}
  function stop(){clearInterval(timer);timer=null;}
  start();
  document.addEventListener('visibilitychange',function(){document.hidden?stop():start();});
})();

/* ===== Небо города: солнце/луна по местному времени ===== */
(function(){
  if(window.__m4sky)return;window.__m4sky=1;
  if(typeof CITY==='undefined'||!CITY.name)return;
  var root=document.documentElement;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero=document.querySelector('.hero');
  var sunEl=document.getElementById('heroSun');
  if(!hero)return;
  var tz=CITY.tz,utc=CITY.utc,prep=null;
  var rec=(window.M4_CITIES||[]).filter(function(c){return c.name===CITY.name})[0];
  if(rec){if(!tz)tz=rec.tz;if(utc==null)utc=rec.utc;prep=rec.prep;}
  function now(){
    var d=new Date();
    if(tz){try{
      var p=new Intl.DateTimeFormat('ru-RU',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
      return {h:+p.filter(function(x){return x.type==='hour'})[0].value,m:+p.filter(function(x){return x.type==='minute'})[0].value};
    }catch(e){}}
    var u=new Date(d.getTime()+d.getTimezoneOffset()*60000+(utc==null?3:utc)*3600000);
    return {h:u.getHours(),m:u.getMinutes()};
  }
  function phaseOf(h){return h>=5&&h<8?'dawn':h>=8&&h<18?'day':(h>=22||h<5)?'night':'dusk';}
  var WORD={dawn:'рассвет',day:'день',dusk:'вечер',night:'ночь'};
  var MODE={auto:'авто',day:'день',night:'ночь'};
  var mode=store.get('m4.theme','auto');if(['auto','day','night'].indexOf(mode)<0)mode='auto';
  var curPhase=null;
  var stars=document.createElement('div');stars.className='sky-stars';stars.setAttribute('aria-hidden','true');
  var sh='';for(var i=0;i<46;i++){var s=(1+Math.random()*1.6).toFixed(1);sh+='<i style="left:'+(Math.random()*100).toFixed(2)+'%;top:'+(Math.random()*72).toFixed(2)+'%;width:'+s+'px;height:'+s+'px;animation-duration:'+(2.2+Math.random()*3.4).toFixed(2)+'s;animation-delay:'+(Math.random()*4).toFixed(2)+'s"></i>';}
  stars.innerHTML=sh;hero.insertBefore(stars,hero.firstChild);
  var cl=document.createElement('div');cl.className='sky-clouds';cl.setAttribute('aria-hidden','true');cl.innerHTML='<i class="c1"></i><i class="c2"></i>';hero.insertBefore(cl,hero.firstChild);
  var col=document.querySelector('.hero-grid > div');
  var chip=document.createElement('button');chip.type='button';chip.className='city-time';chip.id='m4Time';
  chip.title='Оформление подстраивается под время города. Нажми: авто → день → ночь.';
  if(col)col.insertBefore(chip,col.firstChild);
  var IC_SUN='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/></svg>';
  var IC_MOON='<svg viewBox="0 0 24 24"><path d="M20 13.2A8.2 8.2 0 0 1 10.8 4 8.2 8.2 0 1 0 20 13.2Z"/></svg>';
  function sunArt(){
    var rays='';for(var a=0;a<360;a+=30){var r=a*Math.PI/180;rays+='<line x1="'+(100+70*Math.cos(r)).toFixed(1)+'" y1="'+(100+70*Math.sin(r)).toFixed(1)+'" x2="'+(100+85*Math.cos(r)).toFixed(1)+'" y2="'+(100+85*Math.sin(r)).toFixed(1)+'"/>';}
    return '<svg class="sky-art" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="m4sg" cx="38%" cy="34%" r="78%"><stop offset="0%" style="stop-color:var(--m4s1,#FFF3C4)"/><stop offset="55%" style="stop-color:var(--m4s2,#FFCF5E)"/><stop offset="100%" style="stop-color:var(--m4s3,#FFB63A)"/></radialGradient></defs><g class="rays" stroke="#FFC24D" stroke-width="5" stroke-linecap="round">'+rays+'</g><circle cx="100" cy="100" r="52" fill="url(#m4sg)"/><circle cx="100" cy="100" r="52" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/></svg>';
  }
  function moonArt(){
    return '<svg class="sky-art" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="m4mg" cx="36%" cy="32%" r="80%"><stop offset="0%" stop-color="#FBF8EC"/><stop offset="70%" stop-color="#E8E4D4"/><stop offset="100%" stop-color="#CFCBBB"/></radialGradient></defs><circle cx="100" cy="100" r="50" fill="url(#m4mg)"/><circle cx="82" cy="86" r="9" fill="rgba(23,43,77,.10)"/><circle cx="118" cy="72" r="6" fill="rgba(23,43,77,.09)"/><circle cx="122" cy="112" r="11" fill="rgba(23,43,77,.11)"/><circle cx="90" cy="122" r="6" fill="rgba(23,43,77,.08)"/><circle cx="104" cy="98" r="4" fill="rgba(23,43,77,.07)"/><path d="M62 78 A50 50 0 0 1 100 50" stroke="rgba(255,255,255,.7)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }
  function paint(ph){
    root.setAttribute('data-m4phase',ph);
    if(sunEl){sunEl.className='hero-sun '+(ph==='night'?'is-moon':'is-sun');sunEl.innerHTML=ph==='night'?moonArt():sunArt();}
    var imgs=document.querySelectorAll('.logo-img');
    for(var i=0;i<imgs.length;i++){var s=imgs[i].getAttribute('src')||'';imgs[i].src=ph==='night'?s.replace(/logo(-night)?\.svg/,'logo-night.svg'):s.replace(/logo(-night)?\.svg/,'logo.svg');}
    var t=now(),mm=(t.m<10?'0':'')+t.m;
    chip.innerHTML=(ph==='night'?IC_MOON:IC_SUN)+'<b>'+t.h+':'+mm+'</b><span>'+(prep?'в '+prep:'местное время')+' · '+WORD[ph]+'</span><i>'+MODE[mode]+'</i>';
  }
  function apply(){
    var t=now();
    var ph=mode==='auto'?phaseOf(t.h):mode;
    if(ph!==curPhase){curPhase=ph;paint(ph);}
    else{var b=chip.querySelector('b');if(b)b.textContent=t.h+':'+((t.m<10?'0':'')+t.m);}
  }
  chip.addEventListener('click',function(){mode=mode==='auto'?'day':mode==='day'?'night':'auto';store.set('m4.theme',mode);curPhase=null;apply();});
  apply();
  setInterval(function(){if(!document.hidden)apply();},30000);
  if(!reduce){setInterval(function(){
    if(document.hidden||curPhase!=='night')return;
    var s=document.createElement('i');s.className='shoot';
    s.style.left=(10+Math.random()*55)+'%';s.style.top=(6+Math.random()*30)+'%';
    hero.appendChild(s);setTimeout(function(){s.remove();},1400);
  },13000);}
})();

/* ===== Дозаполнение фото: поиск в Wikimedia Commons ===== */
(function(){
  if(window.__m4Fill)return;
  var BUDGET=190,used=0;
  var CATQ={'Погулять':'city park alley trees','Поесть':'restaurant food table','Вдвоём':'theatre auditorium','С детьми':'children museum interactive','Поработать':'library reading room','Необычное':'science museum exhibit','Полезное':'grocery store shelves','Активно':'outdoor workout bars'};
  function clean(v){try{return stripHtml(v)}catch(e){return String(v||'').replace(/<[^>]*>/g,'').trim()}}
  async function csearch(q){
    if(used>=BUDGET)return [];
    used++;
    var ctl=new AbortController(),t=setTimeout(function(){ctl.abort()},9000);
    try{
      var u='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1000',format:'json',formatversion:'2',origin:'*'});
      var r=await fetch(u,{signal:ctl.signal});
      if(!r.ok)return [];
      var j=await r.json();
      return ((j.query||{}).pages)||[];
    }catch(e){return []}finally{clearTimeout(t)}
  }
  function cand(pg){
    var ii=(pg.imageinfo||[])[0];
    if(!ii||!ii.thumburl)return null;
    var mime=ii.mime||'';
    if(mime.indexOf('image/')!==0||/svg/i.test(mime))return null;
    var title=pg.title||'';
    if(/\.svg$/i.test(title))return null;
    if(/(map|plan|logo|coat of arms|diagram|chart|icon|flag|stamp|scheme|locator|blank|portrait of|monument to)/i.test(title))return null;
    var w=ii.thumbwidth||ii.width||0,h=ii.thumbheight||ii.height||0;
    if(w<600||h<380)return null;
    var em=ii.extmetadata||{};
    var lic=clean(em.LicenseShortName&&em.LicenseShortName.value);
    if(/non-free|fair use/i.test(lic))return null;
    var ratio=w/h, score=w;
    if(ratio>=1.25&&ratio<=2.1)score+=900;
    if(ratio<1)score-=800;
    if(/jpeg|jpg/i.test(mime))score+=150;
    return {score:score,photo:ii.thumburl,credit:{
      author:clean(em.Artist&&em.Artist.value)||'автор не указан',
      license:lic||'свободная лицензия',
      page:ii.descriptionurl||('https://commons.wikimedia.org/wiki/'+encodeURIComponent(title))
    }};
  }
  function pick(pages){
    var best=null;
    for(var i=0;i<pages.length;i++){
      var c=cand(pages[i]);
      if(c&&(!best||c.score>best.score))best=c;
    }
    if(best)delete best.score;
    return best;
  }
  async function one(p,out){
    var NAME=(typeof PHOTO_NAME!=='undefined')?PHOTO_NAME:{};
    var TYPE=(typeof PHOTO_TYPE!=='undefined')?PHOTO_TYPE:{};
    var cityName=(typeof CITY!=='undefined'&&CITY.name)?CITY.name:'';
    var tries=[{q:p.name+' '+cityName,real:true}];
    (NAME[p.id]||[]).forEach(function(q){tries.push({q:q,real:true})});
    tries.push({q:TYPE[p.id]||CATQ[p.cat]||p.cat,real:false});
    for(var i=0;i<tries.length;i++){
      if(used>=BUDGET)return;
      var hit=pick(await csearch(tries[i].q));
      if(hit){
        if(!tries[i].real)hit.credit.note='иллюстрация';
        out[p.id]=hit;
        return;
      }
    }
  }
  window.__m4Fill=async function(d){
    if(!d||!d.places||typeof PLACES==='undefined')return;
    var missing=PLACES.filter(function(p){return !d.places[p.id]});
    if(!missing.length)return;
    for(var i=0;i<missing.length;i+=4){
      if(used>=BUDGET)break;
      await Promise.all(missing.slice(i,i+4).map(function(p){return one(p,d.places)}));
    }
  };
})();

/* ===== Фильтр «Только сохранённые» ===== */
(function(){
  var st=document.getElementById('savedTgl'),sb=document.getElementById('savedBtn');
  if(st&&sb)st.addEventListener('click',function(){sb.click();});
})();

/* ===== Умный поиск: раскладываем живой запрос в фильтры ===== */
function m4Parse(raw){
  var q=(raw||'').toLowerCase(),sets={},sum=[];
  function has(list){for(var i=0;i<list.length;i++){if(q.indexOf(list[i])>=0)return true;}return false;}
  if(has(['вдвоём','вдвоем','свидание','для двоих','на двоих','парой','романтик'])){sets.company='two';sum.push('вдвоём');}
  else if(has(['с детьми','с ребёнком','с ребенком','детям','детский','с малыш'])){sets.company='kids';sum.push('с детьми');}
  else if(has(['с друзьями','друзьями','компанией','с другом'])){sets.company='friends';sum.push('с друзьями');}
  else if(has(['один','одна','соло','наедине'])){sets.company='solo';sum.push('в одиночку');}
  if(has(['тих','спокойн','без суеты','уют'])){sets.mood='quiet';sum.push('без суеты');}
  else if(has(['необычн','оригинальн','вау'])){sets.mood='unusual';sum.push('необычное');}
  else if(has(['подвига','активн','спорт'])){sets.mood='active';sum.push('подвигаться');}
  if(has(['бесплатн','без денег','даром','не платить'])){sets.budget='free';sum.push('бесплатно');}
  else{var bm=q.match(/до[^\d]*(\d{2,4})/)||q.match(/(\d{3,4})\s*(?:₽|руб)/)||q.match(/(\d{3,4})/);
    if(bm){var n=+bm[1],tier=n<=500?'500':(n<=1000?'1000':'2000');sets.budget=tier;sum.push('до '+tier+' ₽');}}
  if(has(['в помещении','под крышей','в тепле','внутри','дождь','дожд','холодно'])){sets.weather='in';sum.push('под крышей');}
  else if(has(['на улице','снаружи','на воздухе','прогулк','погулять'])){sets.weather='out';sum.push('на улице');}
  if(has(['открыто','работает сейчас','прямо сейчас'])){sets.open=true;sum.push('открыто сейчас');}
  else if(has([' сейчас'])||/\bсейчас\b/.test(q)){sets.open=true;sum.push('открыто сейчас');}
  if(has(['поесть','голодн','обед','ужин','кофе','кафе','ресторан','перекус','еда'])){sets.tag='eat';sum.push('поесть');}
  else if(has(['погулять','пройтись','парк'])){sets.tag='walk';sum.push('погулять');}
  else if(has(['поработа','ноутбук','офис','учиться','учёба','учеба','коворкинг'])){sets.tag='work';sum.push('поработать');}
  return {matched:sum.length>0,sets:sets,summary:sum.join(' · ')};
}
function m4Smart(q){
  q=(q||'').trim();
  S.tag='all';S.company='any';S.mood='any';S.budget='any';S.weather='any';S.open=false;S.col=null;S.savedOnly=false;
  var r=m4Parse(q);
  if(r.matched){
    Object.assign(S,r.sets);S.q='';
    var qi=document.getElementById('q');if(qi)qi.value='';
    render();goPlaces();toast('Понял так: '+r.summary);
  }else{S.q=q;render();goPlaces();}
}
document.addEventListener('submit',function(e){
  var f=e.target;if(f&&f.id==='searchForm'){e.preventDefault();e.stopPropagation();m4Smart(document.getElementById('q').value);}
},true);
(function(){var qi=document.getElementById('q');if(qi)qi.placeholder='Например: тихое место вдвоём до 500, чтобы было открыто';})();
