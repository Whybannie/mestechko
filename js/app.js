/* Месте4ко · app.js — фото из открытых источников, фильтры, окна, живое состояние */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={
  get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

const S={q:'',tag:'all',company:'any',mood:'any',budget:'any',weather:'any',open:false,savedOnly:false,sort:'rec',col:null,
  saved:new Set(store.get('m4.saved',[])),reports:store.get('m4.reports',{})};
let currentId=null,toastTimer=null,toastHide=null,lastRemoved=null;

const MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const fmtDate=iso=>{const d=new Date(iso+'T12:00:00');return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()};
const fmtShort=iso=>{const d=new Date(iso+'T12:00:00');return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')};
function plural(n,f){const m=n%100;if(m>=11&&m<=14)return f[2];const k=n%10;return k===1?f[0]:k>=2&&k<=4?f[1]:f[2]}
const placesWord=n=>plural(n,['место','места','мест']);

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
const openBadge=p=>{const o=openNow(p);return o===true?'<span class="pill o">Открыто сейчас</span>':o===null?'<span class="pill o afisha">По афише</span>':'<span class="pill o closed">Сейчас закрыто</span>'};
const recheck=p=>!!S.reports[p.id];
const stamp=p=>recheck(p)?'<span class="stamp recheck">На проверке</span>':`<span class="stamp">Проверено ${fmtShort(p.checked)}</span>`;
const budgetLabel=p=>p.budget&&p.budget[1]===0?'Бесплатно':p.budgetText;
const mapUrl=p=>`https://yandex.ru/maps/?pt=${p.lng},${p.lat}&z=17&l=map`;
const placeRoute=p=>`https://yandex.ru/maps/?rtext=~${p.lat},${p.lng}`;

/* ================= ФОТО: Wikipedia / Wikimedia Commons ================= */
const WIKI={
  naberezhnaya:['Михайловская набережная'],
  zaeltsovsky:['Заельцовский парк'],
  bugrinskaya:['Бугринская роща'],
  narymsky:['Нарымский сквер'],
  centralpark:['Центральный парк (Новосибирск)','Новосибирский центральный парк'],
  novat:['Новосибирский театр оперы и балета'],
  fakel:['Красный факел (театр)','Красный факел'],
  zoo:['Новосибирский зоопарк'],
  kukolny:['Новосибирский областной театр кукол'],
  delfinia:['Дельфиния','Новосибирский дельфинарий'],
  planetarium:['Новосибирский планетарий'],
  aquamir:['Аквамир','Аквамир (аквапарк)'],
  gpntb:['Государственная публичная научно-техническая библиотека СО РАН','ГПНТБ СО РАН'],
  aura:['Аура (торговый центр)','Аура (Новосибирск)'],
  tochka:['Академпарк','Технопарк Академгородка']
};
const HERO_T=['Михайловская набережная','Бугринский мост','Речной вокзал (Новосибирск)'];
const CITY_T=['Новосибирск'];
const Photo={pending:true,hero:{name:'Вдоль Оби',cat:'Местный маршрут'},city:{name:'Новосибирск',cat:'Город'}};
const TINT={
  'Погулять':['#E3F4F0','#CDEBE4'],'Поесть':['#FFF2D8','#FFE6BC'],'Вдвоём':['#FFE9E4','#FFD9D0'],
  'С детьми':['#E9EEF7','#D8E2F2'],'Поработать':['#E9EEF7','#DCE4F1'],'Необычное':['#FFF2D8','#FFE9C9'],
  'Полезное':['#E3F4F0','#D5EDE7'],'Активно':['#E3F4F0','#CDEBE4'],'Местный маршрут':['#FFE9E4','#FFDCCF'],'Город':['#E9EEF7','#D8E2F2']
};
const stripHtml=v=>String(v==null?'':v).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const chunk=(a,n)=>{const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o};
const articleUrl=t=>'https://ru.wikipedia.org/wiki/'+encodeURIComponent(t.replace(/ /g,'_'));

async function api(params){
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),9000);
  try{
    const u='https://ru.wikipedia.org/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',origin:'*',...params});
    const r=await fetch(u,{signal:ctl.signal});
    if(!r.ok)throw new Error('http '+r.status);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function resolvePhotos(){
  const titles=[...new Set([...Object.values(WIKI).flat(),...HERO_T,...CITY_T])];
  const found={};
  for(const part of chunk(titles,8)){
    const j=await api({action:'query',redirects:'1',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'900',titles:part.join('|')});
    const q=j.query||{},alias={};
    (q.normalized||[]).forEach(n=>alias[n.from]=n.to);
    (q.redirects||[]).forEach(n=>alias[n.from]=n.to);
    const follow=t=>{let x=t,i=0;while(alias[x]&&i++<6)x=alias[x];return x};
    const byTitle={};
    (q.pages||[]).forEach(p=>{if(p&&p.thumbnail&&p.thumbnail.source)byTitle[p.title]={src:p.thumbnail.source,file:p.pageimage||''}});
    part.forEach(t=>{const hit=byTitle[follow(t)];if(hit)found[t]=hit});
  }
  const files=[...new Set(Object.values(found).map(v=>v.file).filter(Boolean))];
  const meta={};
  for(const part of chunk(files,8)){
    try{
      const j=await api({action:'query',prop:'imageinfo',iiprop:'url|extmetadata',titles:part.map(f=>'File:'+f).join('|')});
      ((j.query||{}).pages||[]).forEach(p=>{
        const ii=(p.imageinfo||[])[0];if(!ii)return;
        const em=ii.extmetadata||{};
        meta[p.title.replace(/^File:/,'')]={
          author:stripHtml(em.Artist&&em.Artist.value)||'автор не указан',
          license:stripHtml(em.LicenseShortName&&em.LicenseShortName.value)||'свободная лицензия',
          page:ii.descriptionurl||('https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(p.title.replace(/^File:/,'')))
        };
      });
    }catch(e){}
  }
  const pick=list=>{for(const t of list){if(found[t])return{photo:found[t].src,credit:{...(meta[found[t].file]||{author:'автор не указан',license:'свободная лицензия',page:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(found[t].file)}),title:t,article:articleUrl(t)}}}return null};
  const out={places:{},hero:null,city:null};
  PLACES.forEach(p=>{const hit=pick(WIKI[p.id]||[]);if(hit)out.places[p.id]=hit});
  out.hero=pick(HERO_T);out.city=pick(CITY_T);
  return out;
}
function applyPhotos(data){
  if(!data)return;
  PLACES.forEach(p=>{const h=data.places&&data.places[p.id];if(h){p.photo=h.photo;p.credit=h.credit}else{delete p.photo;delete p.credit}});
  if(data.hero){Photo.hero.photo=data.hero.photo;Photo.hero.credit=data.hero.credit}
  if(data.city){Photo.city.photo=data.city.photo;Photo.city.credit=data.city.credit}
}
function coverInner(p,eager){
  const t=TINT[p.cat]||['#E3F4F0','#CDEBE4'];
  const typo=`<span class="typo" style="--t1:${t[0]};--t2:${t[1]}"><span class="tk">${p.cat||''}</span><span class="tn">${p.name}</span><span class="tr"></span></span>`;
  const img=p.photo?`<img class="ph" src="${p.photo}" alt="" ${eager?'':'loading="lazy"'} decoding="async" onerror="this.remove()">`:'';
  const skel=(!p.photo&&Photo.pending)?'<span class="skel"></span>':'';
  return typo+img+skel+'<span class="scrim"></span>';
}

/* ================= фильтрация ================= */
function filtered(){
  let list=PLACES.filter(p=>{
    if(S.q){const hay=(p.name+' '+p.desc+' '+p.minus+' '+p.addr+' '+p.area+' '+p.cat+' '+p.feat.join(' ')).toLowerCase();if(!hay.includes(S.q.toLowerCase().trim()))return false}
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
  const bits=[];
  if(S.company!=='any')bits.push(COMPANY[S.company]);
  if(S.mood!=='any')bits.push(MOOD[S.mood]);
  if(S.budget!=='any')bits.push(S.budget==='free'?'Бесплатно':'До '+S.budget+' ₽');
  if(S.weather!=='any')bits.push(S.weather==='in'?'В помещении':'На улице');
  if(S.open)bits.push('Открыто сейчас');
  if(S.tag!=='all')bits.push((CHIPS.find(c=>c.k===S.tag)||{}).n||'');
  if(S.q)bits.push('«'+S.q+'»');
  return bits.filter(Boolean).join(' · ');
}

/* ================= отрисовка ================= */
function cardHtml(p){
  const saved=S.saved.has(p.id);
  return `<article class="card rv" data-id="${p.id}" tabindex="0" role="button" aria-label="Подробнее: ${p.name}">
    <div class="cover">${coverInner(p)}<span class="cat">${p.cat}</span></div>
    <div class="card-b">
      <div class="area">${p.area} район</div>
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <div class="minus"><b>Но:</b> ${p.minus}</div>
      <div class="pills"><span class="pill b">${budgetLabel(p)}</span><span class="pill t">${p.best}</span>${openBadge(p)}</div>
      <div class="feat">${p.feat.join(' · ')}</div>
      <div class="card-f">${stamp(p)}<span class="sp"></span>
        <button class="ibtn ${saved?'saved':''}" data-save="${p.id}" type="button" aria-label="Сохранить ${p.name}" aria-pressed="${saved}"><svg viewBox="0 0 20 20"><path d="M10 17s-7-4.5-7-9a4 4 0 0 1 7-2.5A4 4 0 0 1 17 8c0 4.5-7 9-7 9z"/></svg></button>
        <a class="ibtn" href="${mapUrl(p)}" target="_blank" rel="noopener" data-stop aria-label="Открыть на карте: ${p.name}"><svg viewBox="0 0 20 20"><path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z"/><circle cx="10" cy="8" r="2"/></svg></a>
        <a class="btn btn-coral btn-sm" href="${placeRoute(p)}" target="_blank" rel="noopener" data-stop>Маршрут</a>
      </div>
    </div>
  </article>`;
}
function render(){
  const list=filtered();
  $('#countLine').textContent='Найдено: '+list.length+' '+placesWord(list.length);
  $('#activeHint').textContent=activeSummary();
  $('#grid').innerHTML=list.length?list.map(cardHtml).join(''):
    `<div class="empty"><b>Ничего не нашлось</b>Попробуй убрать фильтры или поискать по-другому.<br><br><button class="btn btn-line" id="emptyReset" type="button">Сбросить фильтры</button></div>`;
  const er=$('#emptyReset');if(er)er.addEventListener('click',()=>{resetAll();toast('Фильтры сброшены')});
  const bn=$('#banner');
  if(S.col){const c=COLS.find(x=>x.k===S.col);bn.classList.add('show');$('#bannerName').textContent=c.n;$('#bannerMeta').textContent='собрал Антон · обновлено 19 ноября · '+list.length+' '+placesWord(list.length)}
  else if(S.savedOnly){bn.classList.add('show');$('#bannerName').textContent='Сохранённое';$('#bannerMeta').textContent=list.length+' '+placesWord(list.length)}
  else bn.classList.remove('show');
  $$('.seg').forEach(g=>{const k=g.dataset.group;$$('button',g).forEach(b=>b.classList.toggle('on',b.dataset.val===String(S[k])))});
  $('#openTgl').classList.toggle('on',S.open);$('#openTgl').setAttribute('aria-pressed',String(S.open));
  $('#savedBtn').classList.toggle('on',S.savedOnly);$('#savedBtn').setAttribute('aria-pressed',String(S.savedOnly));
  $('#sortSel').value=S.sort;
  $$('#chips .chip').forEach(b=>{const k=b.dataset.chip;
    const on=(k==='open'&&S.open)||(k==='warm'&&S.weather==='in')||(k==='free'&&S.budget==='free')||(k==='kids'&&S.company==='kids')||(k==='two'&&S.company==='two')||(['eat','walk','work'].includes(k)&&S.tag===k);
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
  observeRv();
}
function renderChips(){
  $('#chips').innerHTML=CHIPS.map(c=>`<button class="chip" data-chip="${c.k}" type="button" aria-pressed="false"><svg viewBox="0 0 20 20">${c.ic}</svg>${c.n}</button>`).join('');
}
function renderCols(){
  const f=COLS[0],cnt=PLACES.filter(colPred.today).length;
  $('#colFeatured').innerHTML=`<button class="col-feat rv" data-col="today" type="button">
    <div class="txt"><div class="k">Подборка дня</div><h3>${f.n}</h3><p>${f.d}</p>
    <div class="meta"><span>Собрал Антон</span><span>Обновлено 19 ноября 2026</span></div>
    <span class="cnt">${cnt} ${placesWord(cnt)} на сегодняшний вечер →</span></div>
    <div class="art">${coverInner(Photo.hero)}</div></button>`;
  const tints={duo:'var(--blush)',kidsrain:'var(--sky)',work:'var(--sky)',free:'var(--mint)',cheap:'var(--sun-soft)',unusual:'var(--sun-soft)',late:'var(--mint)'};
  const icons={duo:CHIPS[4].ic,kidsrain:CHIPS[3].ic,work:CHIPS[5].ic,free:CHIPS[6].ic,cheap:CHIPS[6].ic,unusual:CHIPS[1].ic,late:CHIPS[7].ic};
  $('#colGrid').innerHTML=COLS.slice(1).map(c=>{const n=PLACES.filter(colPred[c.k]).length;
    return `<button class="col rv" data-col="${c.k}" type="button">
      <span class="ic" style="background:${tints[c.k]}"><svg viewBox="0 0 20 20">${icons[c.k]}</svg></span>
      <h3>${c.n}</h3><p>${c.d}</p>
      <div class="meta"><span>Антон · 19.11</span><b>${n} ${placesWord(n)}</b></div></button>`}).join('');
}
function paintArt(){
  $('#routeArt').innerHTML=coverInner(Photo.hero,true);
  $('#suggestArt').innerHTML=coverInner(Photo.city);
  $('#rtCover').innerHTML='<button class="dlg-x" data-close type="button" aria-label="Закрыть">✕</button>'+coverInner(Photo.hero,true);
}
function renderSources(){
  const shot=PLACES.filter(p=>p.photo).length;
  $('#srcLead').textContent='Фотографии — из Wikipedia и Wikimedia Commons, свободные лицензии. Ниже автор и лицензия каждого снимка. Найдено '+shot+' из '+PLACES.length+' мест; остальные снимем сами после визита.';
  $('#srcList').innerHTML=PLACES.map((p,i)=>{
    if(p.photo&&p.credit){
      const c=p.credit;
      return `<li><img class="th" src="${p.photo}" alt="" loading="lazy" onerror="this.remove()"><div><b>${p.name}</b><span>${c.author} · ${c.license}</span><a href="${c.page}" target="_blank" rel="noopener">Источник снимка</a> · <a href="${c.article}" target="_blank" rel="noopener">статья</a></div></li>`;
    }
    return `<li><span class="n">${i+1}</span><div><b>${p.name}</b><span>Фото ещё нет — снимем и поставим после визита</span></div></li>`;
  }).join('')+(()=>{const h=Photo.hero;return h.photo&&h.credit?`<li><img class="th" src="${h.photo}" alt="" loading="lazy" onerror="this.remove()"><div><b>Маршрут «Вдоль Оби»</b><span>${h.credit.author} · ${h.credit.license}</span><a href="${h.credit.page}" target="_blank" rel="noopener">Источник снимка</a></div></li>`:''})();
}
function saveState(){store.set('m4.saved',[...S.saved]);store.set('m4.reports',S.reports);$('#savedCount').textContent=S.saved.size}

/* ================= тост ================= */
function toast(msg,label,fn){
  const el=$('#toast'),b=$('#toastAct');
  clearTimeout(toastTimer);clearTimeout(toastHide);
  $('#toastText').textContent=msg;
  if(label){b.hidden=false;b.textContent=label;b.onclick=()=>{fn();hideToast()}}else{b.hidden=true;b.onclick=null}
  if(typeof el.showPopover==='function'){try{el.showPopover()}catch(e){}}
  el.classList.add('show');
  toastTimer=setTimeout(hideToast,3600);
}
function hideToast(){
  const el=$('#toast');el.classList.remove('show');
  clearTimeout(toastHide);
  toastHide=setTimeout(()=>{if(!el.classList.contains('show')&&typeof el.hidePopover==='function'){try{el.hidePopover()}catch(e){}}},280);
}

/* ================= сохранённое ================= */
function toggleSave(id){
  if(S.saved.has(id)){S.saved.delete(id);lastRemoved=id;saveState();render();toast('Убрано из сохранённых','Вернуть',()=>{S.saved.add(lastRemoved);saveState();render()})}
  else{S.saved.add(id);saveState();render();toast('Сохранено. Найдёшь в «Сохранённом» сверху')}
  if(currentId===id&&$('#placeDlg').open)pdSave();
}
function pdSave(){
  const on=S.saved.has(currentId);
  $('#pdSave').textContent=on?'♥ Сохранено':'Сохранить';
  $('#pdSave').setAttribute('aria-pressed',String(on));
}

/* ================= окна ================= */
function showDialog(d){if(!d.open)d.showModal();document.body.classList.add('lock')}
function openPlace(id){
  const p=PLACES.find(x=>x.id===id);if(!p)return;currentId=id;
  $('#pdCover').innerHTML='<button class="dlg-x" data-close type="button" aria-label="Закрыть">✕</button>'+coverInner(p,true);
  $('#pdCat').textContent=p.cat+' · '+p.area+' район';
  $('#pdName').textContent=p.name;
  $('#pdAddr').textContent=p.addr;
  $('#pdDesc').textContent=p.desc;
  $('#pdMinus').innerHTML='<b>Но:</b> '+p.minus;
  $('#pdTags').innerHTML=[...p.company.map(c=>`<span class="pill b">${COMPANY[c]||c}</span>`),...p.mood.map(m=>`<span class="pill t">${MOOD[m]}</span>`),`<span class="pill ${p.indoor?'o afisha':'o'}">${p.indoor?'В помещении':'На улице'}</span>`,openBadge(p)].join('');
  $('#pdBudget').textContent=p.budgetText;
  $('#pdBest').textContent=p.best;
  $('#pdHours').textContent=p.hoursText;
  $('#pdFeat').textContent=p.feat.join(', ');
  const st=$('#pdStamp');
  if(recheck(p)){st.className='stamp recheck';st.textContent='На проверке'}else{st.className='stamp';st.textContent='Проверено '+fmtDate(p.checked)}
  $('#pdSrc').innerHTML=p.src+(p.credit?` · <a href="${p.credit.page}" target="_blank" rel="noopener">фото: ${p.credit.license}</a>`:'');
  $('#pdRoute').href=placeRoute(p);
  $('#pdMap').href=mapUrl(p);
  pdSave();
  showDialog($('#placeDlg'));
}
function openReport(id){
  $('#rpPlace').innerHTML=PLACES.map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${p.name}</option>`).join('');
  $('#rpType').selectedIndex=0;$('#rpText').value='';
  if($('#placeDlg').open)$('#placeDlg').close();
  showDialog($('#reportDlg'));
}
function resetAll(){
  Object.assign(S,{q:'',tag:'all',company:'any',mood:'any',budget:'any',weather:'any',open:false,savedOnly:false,sort:'rec',col:null});
  $('#q').value='';render();
}
function applyCol(k){
  resetAll();S.col=k;Object.assign(S,colApply[k]||{});
  render();$('#places').scrollIntoView({behavior:reduced?'auto':'smooth'});
}
const goPlaces=()=>$('#places').scrollIntoView({behavior:reduced?'auto':'smooth'});

/* ================= события ================= */
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
$$('.seg').forEach(g=>g.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  S[g.dataset.group]=b.dataset.val;S.col=null;render();
}));
$('#openTgl').addEventListener('click',()=>{S.open=!S.open;S.col=null;render()});
$('#sortSel').addEventListener('change',e=>{S.sort=e.target.value;render()});
$('#resetBtn').addEventListener('click',()=>{resetAll();toast('Фильтры сброшены')});
$('#bannerClear').addEventListener('click',()=>{S.col=null;S.savedOnly=false;render()});
$('#savedBtn').addEventListener('click',()=>{
  S.savedOnly=!S.savedOnly;S.col=null;render();goPlaces();
  if(S.savedOnly&&!S.saved.size)toast('Пока пусто — жми ♥ на карточке места');
});
$('#randomBtn').addEventListener('click',()=>{
  const list=filtered();
  if(!list.length){toast('Под эти условия ничего нет — сбрось фильтры');return}
  const p=list[Math.floor(Math.random()*list.length)];
  openPlace(p.id);toast('Случайное место: '+p.name);
});
document.addEventListener('click',e=>{
  const col=e.target.closest('[data-col]');if(col){applyCol(col.dataset.col);return}
  const sv=e.target.closest('[data-save]');if(sv){e.stopPropagation();toggleSave(sv.dataset.save);return}
  if(e.target.closest('[data-stop]'))return;
  const card=e.target.closest('.card');if(card){openPlace(card.dataset.id);return}
  const cl=e.target.closest('[data-close]');if(cl){const d=cl.closest('dialog');if(d)d.close()}
});
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(t&&t.classList&&t.classList.contains('card')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openPlace(t.dataset.id)}
});
$('#pdSave').addEventListener('click',()=>toggleSave(currentId));
$('#pdReport').addEventListener('click',()=>openReport(currentId));
$('#footReport').addEventListener('click',()=>openReport(PLACES[0].id));
$('#footSources').addEventListener('click',()=>{renderSources();showDialog($('#sourcesDlg'))});
$('#suggestOpen').addEventListener('click',()=>{$('#suggestForm').style.display='block';$('#suggestOk').classList.remove('show');showDialog($('#suggestDlg'))});
$('#routeOpen').addEventListener('click',()=>showDialog($('#routeDlg')));
$('#suggestForm').addEventListener('submit',e=>{
  e.preventDefault();
  const arr=store.get('m4.suggests',[]);
  arr.push({...Object.fromEntries(new FormData(e.target).entries()),at:new Date().toISOString()});
  store.set('m4.suggests',arr);
  e.target.style.display='none';$('#suggestOk').classList.add('show');
  toast('Спасибо! Заявка принята');
});
$('#suggestAgain').addEventListener('click',()=>{$('#suggestOk').classList.remove('show');const f=$('#suggestForm');f.reset();f.style.display='block'});
$('#reportForm').addEventListener('submit',e=>{
  e.preventDefault();
  const id=$('#rpPlace').value,arr=store.get('m4.reportList',[]);
  arr.push({id,type:$('#rpType').value,text:$('#rpText').value,at:new Date().toISOString()});
  store.set('m4.reportList',arr);
  S.reports[id]=true;saveState();
  $('#reportDlg').close();render();
  toast('Спасибо! Место отмечено «На проверке»');
});
$$('dialog').forEach(d=>{
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  d.addEventListener('close',()=>{if(!$$('dialog').some(x=>x.open))document.body.classList.remove('lock')});
});

/* ================= движение и живой статус ================= */
let io;
function observeRv(){
  if(!('IntersectionObserver'in window)){$$('.rv').forEach(el=>el.classList.add('in'));return}
  if(!io)io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.06});
  $$('.rv:not(.in)').forEach(el=>io.observe(el));
}
const hd=$('#hd');
let ticking=false;
addEventListener('scroll',()=>{
  if(ticking)return;ticking=true;
  requestAnimationFrame(()=>{
    hd.classList.toggle('scrolled',scrollY>10);
    if(!reduced&&scrollY<900){
      $('#heroSun').style.translate='0 '+(scrollY*.16)+'px';
      $('#heroRiver').style.translate='0 '+(scrollY*.06)+'px';
    }
    ticking=false;
  });
},{passive:true});
if('IntersectionObserver'in window){
  const secIO=new IntersectionObserver(es=>es.forEach(x=>{
    if(x.isIntersecting)$$('[data-nav]').forEach(a=>a.classList.toggle('on',a.dataset.nav===x.target.id));
  }),{rootMargin:'-40% 0px -55% 0px'});
  ['collections','places','suggest'].forEach(id=>{const el=document.getElementById(id);if(el)secIO.observe(el)});
}
setInterval(()=>{if(!$$('dialog').some(d=>d.open))render()},60000);

/* ================= старт ================= */
$('#rtStops').innerHTML=ROUTE_STOPS.map((s,i)=>`<li><span class="n">${i+1}</span><div style="flex:1"><b>${s.n}</b><span>${s.d}</span></div><a href="https://yandex.ru/maps/?pt=${s.lng},${s.lat}&z=16&l=map" target="_blank" rel="noopener">На карте</a></li>`).join('');
$('#routeBuild').href=routeUrl;
$('#rtBuild').href=routeUrl;

const cached=store.get('m4.ph.v1',null);
if(cached&&cached.at&&Date.now()-cached.at<6048e5){applyPhotos(cached.data);Photo.pending=false}
renderChips();renderCols();paintArt();saveState();render();observeRv();

if(Photo.pending){
  resolvePhotos().then(data=>{
    applyPhotos(data);Photo.pending=false;
    store.set('m4.ph.v1',{at:Date.now(),data});
    renderCols();paintArt();render();
    if($('#sourcesDlg').open)renderSources();
  }).catch(()=>{Photo.pending=false;renderCols();paintArt();render()});
}
