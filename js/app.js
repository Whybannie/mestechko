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
  $('#countLine').textContent=list.length+' '+pw(list.length);
  $('#activeHint').textContent=activeSummary();
  $('#grid').innerHTML=list.length?list.map(cardHtml).join(''):`<div class="empty"><b>Пусто</b>Под эти условия ничего нет.<br><br><button class="btn btn-line" id="emptyReset" type="button">Сбросить фильтры</button></div>`;
  const er=$('#emptyReset');if(er)er.addEventListener('click',()=>{resetAll();toast('Фильтры сброшены')});
  const bn=$('#banner');
  if(S.col){const c=COLS.find(x=>x.k===S.col);bn.classList.add('show');$('#bannerName').textContent=c.n;$('#bannerMeta').textContent=EDITOR+' · '+ISSUE+' · '+list.length+' '+pw(list.length)}
  else if(S.savedOnly){bn.classList.add('show');$('#bannerName').textContent='Сохранённое';$('#bannerMeta').textContent=list.length+' '+pw(list.length)}
  else bn.classList.remove('show');
  $$('.seg').forEach(g=>{const k=g.dataset.group;$$('button',g).forEach(b=>b.classList.toggle('on',b.dataset.val===String(S[k])))});
  $('#openTgl').classList.toggle('on',S.open);$('#openTgl').setAttribute('aria-pressed',String(S.open));
  $('#savedBtn').classList.toggle('on',S.savedOnly);$('#savedBtn').setAttribute('aria-pressed',String(S.savedOnly));
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
    `<li><img class="th" src="${p.photo}" alt="" loading="lazy" onerror="this.remove()"><div><b>${p.name}</b><span>${p.credit.author} · ${p.credit.license}</span><a href="${p.credit.page}" target="_blank" rel="noopener">Источник</a></div></li>`:
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
  M.layer=L.layerGroup().addTo(M.map);M.ready=true;
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
  resolvePhotos().then(d=>{applyPhotos(d);Photo.pending=false;store.set(CK+'.ph.v2',{at:Date.now(),data});renderCols();paintArt();render();if($('#sourcesDlg').open)renderSources()})
  .catch(()=>{Photo.pending=false;renderCols();paintArt();render()});
}

/* ===== Выбор города ===== */
(function(){
  if(typeof CITY==='undefined'||!CITY.name)return;
  var CITIES=[
    {name:'Новосибирск',folder:''},
    {name:'Москва',folder:'moskva'},
    {name:'Красноярск',folder:'krasnoyarsk'}
  ];
  var cur=CITIES.filter(function(c){return c.name===CITY.name})[0]||CITIES[0];
  function href(t){
    var cf=cur.folder,tf=t.folder;
    if(tf===cf)return null;
    if(cf==='')return tf?tf+'/':'./';
    return tf?'../'+tf+'/':'../';
  }
  function ensureDlg(){
    var d=document.getElementById('cityDlg');
    if(d)return d;
    d=document.createElement('dialog');
    d.id='cityDlg';
    d.innerHTML='<div class="dlg-form"><h3>Ваш город</h3><p class="lead">Выберите город: подборки, места и карта зависят от него.</p><div class="city-list" id="cityList"></div><div class="form-row"><button class="btn btn-line" type="button" id="cityClose">Закрыть</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('#cityClose').addEventListener('click',function(){d.close()});
    d.addEventListener('click',function(e){if(e.target===d)d.close()});
    d.addEventListener('close',function(){if(!document.querySelector('dialog[open]'))document.body.classList.remove('lock')});
    return d;
  }
  function openList(){
    var d=ensureDlg();
    var list=d.querySelector('#cityList');
    list.innerHTML=CITIES.map(function(t){
      if(t.name===CITY.name)return '<div class="city-row cur"><span class="cr-name">'+t.name+'</span><span class="cr-badge">вы здесь</span></div>';
      return '<button class="city-row" type="button" data-city="'+t.name+'"><span class="cr-name">'+t.name+'</span><span class="cr-go">перейти →</span></button>';
    }).join('');
    var btns=list.querySelectorAll('[data-city]');
    for(var i=0;i<btns.length;i++){
      btns[i].addEventListener('click',function(){
        var nm=this.getAttribute('data-city');
        store.set('m4.city',nm);
        var t=CITIES.filter(function(c){return c.name===nm})[0];
        var h=href(t);
        if(h)location.href=h;
      });
    }
    d.showModal();
    document.body.classList.add('lock');
  }
  var sw=document.querySelector('.city-sw');
  if(sw){
    sw.innerHTML='';
    var b=document.createElement('button');
    b.className='city-pick';b.type='button';
    b.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z"/><circle cx="10" cy="8" r="2"/></svg><span class="cp-label">Ваш город</span><b>'+CITY.name+'</b>';
    b.addEventListener('click',openList);
    sw.appendChild(b);
  }
  var saved=store.get('m4.city',null);
  if(!saved){
    setTimeout(function(){
      var d=document.getElementById('cityConfirm');
      if(!d){
        d=document.createElement('dialog');
        d.id='cityConfirm';
        d.innerHTML='<div class="dlg-form"><h3>Ваш город — '+CITY.name+'?</h3><p class="lead">Мы покажем места, подборки и карту для этого города.</p><div class="form-row"><button class="btn btn-line" type="button" id="ccOther">Выбрать город</button><button class="btn btn-red" type="button" id="ccYes">Да, верно</button></div></div>';
        document.body.appendChild(d);
        d.querySelector('#ccYes').addEventListener('click',function(){store.set('m4.city',CITY.name);d.close()});
        d.querySelector('#ccOther').addEventListener('click',function(){store.set('m4.city',CITY.name);d.close();openList()});
        d.addEventListener('close',function(){if(!document.querySelector('dialog[open]'))document.body.classList.remove('lock')});
      }
      d.showModal();
      document.body.classList.add('lock');
    },600);
  }
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
