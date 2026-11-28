/* Месте4ко · семантический поиск, интересы, «Популярное» и промо */
(function(){
if(window.__m4ai||typeof PLACES==='undefined')return;window.__m4ai=1;
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function byId(id){for(var i=0;i<PLACES.length;i++)if(PLACES[i].id===id)return PLACES[i];return null}

/* ---- словарь намерений: st — подстроки (>=4), wd — точные слова, kw — что искать в карточке ---- */
var LEX=[
{id:'banya',say:'попариться',st:['попар','парил','саун','хамам','бань','бане','бани','баню','веник'],wd:['баня','пар'],kw:['баня','сауна','хамам','парная','банный','веник','термы'],f:{}},
{id:'eat',say:'поесть',st:['поесть','пожрать','перекус','голод','проголод','обед','ужин','позавтрак','наесть'],wd:['еда','жрать'],kw:['еда','обед','ужин','меню','кухня','бургер','пельмени','суп'],cat:['Поесть'],f:{tag:'eat'}},
{id:'coffee',say:'кофе',st:['кофе','капучин','латте','эспрессо','взбодр','кофейн','раф '],wd:['кофе','раф'],kw:['кофе','кофейня','латте','капучино','эспрессо','десерт'],f:{}},
{id:'work',say:'поработать',st:['поработ','ноутбук','ноутом','фриланс','коворкинг','позанима','учеб','розетк','созвон'],wd:['работа','офис'],kw:['wi-fi','вайфай','розетки','коворкинг','тихо','большие столы','читальный'],cat:['Поработать'],f:{tag:'work'}},
{id:'date',say:'на свидание',st:['свидани','вдвоем','романтик','девушк','парнем','впечатлит'],wd:['вдвоём'],kw:['свидание','вдвоём','приглушённый','бронь','закат','вид'],cat:['Вдвоём'],f:{company:'two'}},
{id:'kids',say:'с детьми',st:['ребенк','детьми','детям','малыш','дочк','сыном','поиграть','детск'],wd:['дети','ребёнок'],kw:['детск','игров','малыш','коляск','аттракцион','интерактив'],cat:['С детьми'],f:{company:'kids'}},
{id:'walk',say:'погулять',st:['погуля','прогул','пройтис','подышать','свежем воздух','алле'],wd:['парк','сквер'],kw:['парк','набережная','аллея','дорожки','сквер','сосны','лавочки'],f:{tag:'walk'}},
{id:'sport',say:'подвигаться',st:['потрен','покач','турник','брусь','побегать','пробеж','бассейн','поплав','коньк','каток','лыж','футбол','волейбол','скалодром','йога'],wd:['спорт','зал'],kw:['турники','брусья','бассейн','каток','коньки','лыжи','воркаут','горки','скалодром'],cat:['Активно'],f:{mood:'active'}},
{id:'night',say:'вечером',st:['потанцев','тусовк','вечеринк','коктейл','выпит','пьян','ночн','поздно'],wd:['бар','клуб','пиво'],kw:['бар','коктейль','пиво','клуб','танцпол','после 22','круглосуточно'],f:{}},
{id:'cinema',say:'в кино или театр',st:['кино','фильм','спектакл','театр','опер','балет','концерт','афиш','мюзикл','оперетт'],wd:['кино'],kw:['театр','спектакль','афиша','сцена','опер','балет','концерт','кинотеатр'],f:{}},
{id:'museum',say:'в музей',st:['музе','выставк','галере','картин','искусств','экспози','мамонт'],wd:['музей'],kw:['музей','выставка','галерея','экспозиция','живопись','экскурсии'],f:{weather:'in'}},
{id:'unusual',say:'что-то необычное',st:['необычн','удивит','прикольн','оригинальн','впервые','вау'],wd:['вау'],kw:['необычн','планетарий','дельфин','лабиринт','опыты','конструктивизм','маятник'],f:{mood:'unusual'}},
{id:'quiet',say:'без суеты',st:['тихо','тишин','спокойн','уединит','помолчат','без сует','уютн'],wd:['тихо'],kw:['тихо','спокойно','без суеты','лавочки','росписи','полумрак'],f:{mood:'quiet'}},
{id:'free',say:'бесплатно',st:['бесплатн','даром','халяв','не платит','без денег'],wd:['бесплатно'],kw:['бесплатно','вход свободный'],f:{budget:'free'}},
{id:'cheap',say:'недорого',st:['недорог','дешев','бюджетн','экономн','подешевл'],wd:['дешево'],kw:['200','300','350','400','450','500'],f:{budget:'500'}},
{id:'indoor',say:'в тепло',st:['дожд','промок','холодн','тепле','под крыш','внутр','ненасть','мороз'],wd:['тепло'],kw:['под крышей','в помещении','оранжереи','фудкорт'],f:{weather:'in'}},
{id:'open',say:'открыто сейчас',st:['открыто','работает сейчас','прямо сейчас','сейчас открыт'],wd:['сейчас'],kw:['круглосуточно','24/7'],f:{open:true}},
{id:'pets',say:'с животными',st:['собак','питомц','животн','песик','котом'],wd:['собака'],kw:['с животными','можно с собакой','питомц'],f:{}},
{id:'photo',say:'сфоткаться',st:['сфотка','фотограф','фотозон','инстаграм','красивый вид','панорам','смотров'],wd:['фото'],kw:['фотозона','вид на реку','панорама','смотровая','арка','подсветка','закат'],f:{}},
{id:'view',say:'посмотреть город',st:['вид на','панорам','смотров','крыш','обзор','колесо'],wd:['вид'],kw:['вид на реку','колесо обозрения','смотровая','мост','панорама'],f:{}},
{id:'shop',say:'по магазинам',st:['магазин','шоппинг','шопинг','торгов','купить','тц '],wd:['тц'],kw:['тц','фудкорт','магазины','парковка','детская зона'],f:{weather:'in'}},
{id:'health',say:'аптека',st:['аптек','лекарств','заболел','голова болит','температур','таблетк'],wd:['аптека'],kw:['аптека','24/7','консультация','фармацевт'],f:{}},
{id:'wc',say:'туалет',st:['туалет','уборн','в туалет'],wd:['туалет'],kw:['туалет','туалеты'],f:{}},
{id:'charge',say:'зарядить телефон',st:['зарядит','зарядк','телефон сел','разряд','повербанк'],wd:['розетка'],kw:['зарядки','розетки','24/7'],f:{}},
{id:'eco',say:'сдать вторсырьё',st:['сдать','батарейк','вторсыр','переработ','утилиз','одежду отда'],wd:['сдать'],kw:['приём','вторсырьё','батарейки','благотворительность','одежды'],f:{}},
{id:'docs',say:'документы',st:['документ','паспорт','справк','мфц','госуслуг','прописк'],wd:['мфц'],kw:['мфц','документы','справка','консультация'],f:{}},
{id:'beauty',say:'постричься',st:['пострич','стрижк','парикмахер','маникюр','барбер'],wd:['стрижка'],kw:['парикмахерская','стрижка','барбершоп'],f:{}},
{id:'fix',say:'починить',st:['починит','ремонт','обувь','ключи','химчист','ателье'],wd:['ремонт'],kw:['ремонт','мастерская','химчистка','ателье','ключи'],f:{}},
{id:'swim',say:'поплавать',st:['поплав','бассейн','аквапарк','горки','водн','купаться'],wd:['бассейн'],kw:['бассейн','аквапарк','горки','термы','лягушатник'],f:{}}
];
function matchIntents(q){
 var n=norm(q),toks=n.split(' '),out=[];
 LEX.forEach(function(it){
  var hit=false;
  (it.st||[]).forEach(function(s){if(s.length>=4&&n.indexOf(s)>=0)hit=true});
  (it.wd||[]).forEach(function(w){if(toks.indexOf(norm(w))>=0)hit=true});
  if(hit)out.push(it);
 });
 return out;
}
function hay(p){
 if(p.__hay)return p.__hay;
 p.__hay={name:norm(p.name),cat:norm(p.cat),feat:norm((p.feat||[]).join(' ')),tags:norm((p.tags||[]).join(' ')),lead:norm(p.lead),desc:norm(p.desc),area:norm(p.area)};
 return p.__hay;
}

/* ---- интересы: только локально ---- */
var AK='m4.aff';
function affRead(){try{return JSON.parse(localStorage.getItem(AK)||'{}')}catch(e){return {}}}
function affWrite(o){try{localStorage.setItem(AK,JSON.stringify(o))}catch(e){}}
function keys(p){
 var k=['cat:'+p.cat];
 (p.tags||[]).forEach(function(t){k.push('tag:'+t)});
 (p.mood||[]).forEach(function(t){k.push('mood:'+t)});
 (p.company||[]).forEach(function(t){k.push('co:'+t)});
 (p.feat||[]).slice(0,6).forEach(function(t){k.push('f:'+norm(t))});
 return k;
}
function bump(p,w){
 var o=affRead(),now=Date.now();
 keys(p).forEach(function(k){var r=o[k]||{v:0,t:now};r.v+=w;r.t=now;o[k]=r});
 affWrite(o);
}
var HALF=14*864e5;
function affScore(p){
 var o=affRead(),now=Date.now(),s=0;
 keys(p).forEach(function(k){var r=o[k];if(!r)return;s+=r.v*Math.pow(0.5,(now-r.t)/HALF)});
 return s;
}
function affTop(){
 var o=affRead(),now=Date.now(),a=[];
 for(var k in o){var r=o[k];a.push([k,r.v*Math.pow(0.5,(now-r.t)/HALF)])}
 a.sort(function(x,y){return y[1]-x[1]});return a.slice(0,3).map(function(x){return x[0]});
}

/* ---- оценка ---- */
function scorePlace(p,ints,toks){
 var h=hay(p),s=0;
 ints.forEach(function(it){
  (it.kw||[]).forEach(function(k){
   k=norm(k);
   if(h.name.indexOf(k)>=0)s+=6;
   if(h.cat.indexOf(k)>=0)s+=5;
   if(h.feat.indexOf(k)>=0)s+=4;
   if(h.tags.indexOf(k)>=0)s+=3;
   if(h.lead.indexOf(k)>=0)s+=3;
   if(h.desc.indexOf(k)>=0)s+=2;
  });
  if(it.cat&&it.cat.indexOf(p.cat)>=0)s+=4;
 });
 toks.forEach(function(t){if(t.length>3&&h.name.indexOf(t)>=0)s+=4});
 if(s>0){
  if(typeof openNow==='function'&&openNow(p)===true)s+=2;
  if(!p.draft)s+=1;
  s+=Math.min(6,affScore(p)*0.4);
 }
 return s;
}

/* ---- режимы ---- */
window.__m4Rank=null;window.__m4Pop=false;window.__m4Say=null;
var _filtered=filtered;
filtered=function(){
 var list=_filtered();
 if(window.__m4Rank&&S.sort==='rec'){
  var r=window.__m4Rank;
  list=list.filter(function(p){return r[p.id]>0});
  list.sort(function(a,b){return r[b.id]-r[a.id]});
 }else if(window.__m4Pop){
  list=list.slice().sort(function(a,b){
   var sa=affScore(a)+(a.popular?6:0)+(a.promo?0:0),sb=affScore(b)+(b.popular?6:0);
   return sb-sa;
  });
  var promo=list.filter(function(p){return p.promo||p.paid});
  var rest=list.filter(function(p){return !(p.promo||p.paid)});
  promo.slice(0,2).forEach(function(p,i){p.__promoSlot=true;rest.splice(Math.min(rest.length,i===0?1:6),0,p)});
  list=rest;
 }
 return list;
};

/* ---- умный поиск ---- */
m4Smart=function(q){
 q=(q||'').trim();
 window.__m4Rank=null;window.__m4Say=null;
 S.tag='all';S.company='any';S.mood='any';S.budget='any';S.weather='any';S.open=false;S.col=null;S.savedOnly=false;
 if(!q){render();return}
 var base=(typeof m4Parse==='function')?m4Parse(q):{matched:false,sets:{}};
 if(base.matched)Object.assign(S,base.sets);
 var ints=matchIntents(q);
 ints.forEach(function(it){
  if(!it.f)return;
  for(var k in it.f){
   if(k==='open'){if(!S.open)S.open=it.f[k]}
   else if(S[k]==='any'||S[k]==='all')S[k]=it.f[k];
  }
 });
 if(ints.length){
  var rank={},toks=norm(q).split(' ').filter(function(t){return t.length>3});
  PLACES.forEach(function(p){var s=scorePlace(p,ints,toks);if(s>0)rank[p.id]=s});
  window.__m4Rank=rank;
  window.__m4Say=ints.map(function(i){return i.say});
  S.q='';
 }else{S.q=q}
 window.__m4Limit=18;window.__m4Sig=null;
 render();if(typeof goPlaces==='function')goPlaces();
};

/* ---- отслеживание внимания ---- */
var _open=openPlace;
openPlace=function(id){var p=byId(id);if(p)bump(p,3);_open(id)};
if(typeof toggleSave==='function'){
 var _save=toggleSave;
 toggleSave=function(id){var p=byId(id);if(p&&!S.saved.has(id))bump(p,5);_save(id)};
}

/* ---- оформление результатов ---- */
var _render=render;
render=function(){_render();decorate()};
function decorate(){
 var head=document.querySelector('.results-head');if(!head)return;
 var bar=document.getElementById('aiSay');
 if(!bar){bar=document.createElement('div');bar.id='aiSay';bar.className='ai-say';head.parentNode.insertBefore(bar,head.nextSibling)}
 var bits=[];
 if(window.__m4Say&&window.__m4Say.length)bits=window.__m4Say.slice(0,4);
 var extra=[];
 if(S.budget!=='any')extra.push(S.budget==='free'?'бесплатно':'до '+S.budget+' ₽');
 if(S.company!=='any')extra.push({two:'вдвоём',kids:'с детьми',friends:'с друзьями',solo:'один'}[S.company]);
 if(S.weather!=='any')extra.push(S.weather==='in'?'под крышей':'на улице');
 if(S.open)extra.push('открыто сейчас');
 var all=bits.concat(extra);
 if(all.length){
  bar.innerHTML='<span class="ai-l">Понял так:</span>'+all.map(function(t){return '<b>'+t+'</b>'}).join('')+'<button type="button" id="aiClear">Сбросить</button>';
  bar.classList.add('on');
  var c=document.getElementById('aiClear');
  if(c)c.onclick=function(){window.__m4Rank=null;window.__m4Say=null;window.__m4Pop=false;var qi=document.getElementById('q');if(qi)qi.value='';if(typeof resetAll==='function')resetAll();else render()};
 }else{bar.classList.remove('on');bar.innerHTML=''}
 var promoN=0;
 PLACES.forEach(function(p){
  var card=document.querySelector('.card[data-id="'+p.id+'"]');
  if(!card)return;
  var old=card.querySelector('.promo-tag');if(old)old.remove();
  if(p.__promoSlot){
   promoN++;
   var t=document.createElement('span');t.className='promo-tag';t.textContent='Промо';
   var cov=card.querySelector('.cover')||card.querySelector('.body');if(cov)cov.appendChild(t);
  }
  p.__promoSlot=false;
 });
 var dis=document.getElementById('promoDis');
 if(promoN){
  if(!dis){dis=document.createElement('div');dis.id='promoDis';dis.className='promo-dis';bar.parentNode.insertBefore(dis,bar.nextSibling)}
  dis.textContent='В выдаче '+promoN+' платн'+(promoN===1?'ое место':'ых места')+' — они помечены «Промо». Порядок остальных не продаётся.';
 }else if(dis)dis.remove();
 var empty=document.querySelector('.grid .empty');
 if(empty&&window.__m4Rank){
  empty.innerHTML='<b>Не понял запрос</b>Попробуйте проще: «попариться», «поработать с ноутбуком», «с детьми в дождь».<br><br><button class="btn btn-line" type="button" id="aiSimple">Искать по тексту</button>';
  var sb=document.getElementById('aiSimple');
  if(sb)sb.onclick=function(){var qi=document.getElementById('q');var v=qi?qi.value:'';window.__m4Rank=null;window.__m4Say=null;S.q=v;render()};
 }
}

/* ---- кнопка «Популярное» ---- */
function findPop(){
 var els=document.querySelectorAll('button,a');
 for(var i=0;i<els.length;i++){if(/популярн/i.test(els[i].textContent||''))return els[i]}
 return null;
}
var popBtn=findPop();
if(!popBtn){
 var head=document.querySelector('.results-head');
 if(head){popBtn=document.createElement('button');popBtn.type='button';popBtn.className='m4net';popBtn.textContent='Популярное';head.appendChild(popBtn)}
}
if(popBtn){
 popBtn.addEventListener('click',function(){
  window.__m4Pop=!window.__m4Pop;window.__m4Rank=null;window.__m4Say=null;
  popBtn.classList.toggle('off',window.__m4Pop);
  window.__m4Limit=18;window.__m4Sig=null;render();
  if(window.__m4Pop){
   var top=affTop();
   var msg=top.length?'Подобрано по вашим интересам: '+top.map(function(k){return k.split(':')[1]}).join(', '):'Пока нет истории — показываем выбор редакции';
   if(typeof toast==='function')toast(msg,'Сбросить',function(){affWrite({});render();if(typeof toast==='function')toast('Интересы сброшены')});
  }
 });
}
var qi=document.getElementById('q');
if(qi)qi.addEventListener('input',function(){window.__m4Rank=null;window.__m4Say=null});
document.addEventListener('click',function(e){
 if(e.target.closest('.seg')||e.target.closest('.chip')||e.target.closest('#resetBtn')){window.__m4Rank=null;window.__m4Say=null;window.__m4Pop=false}
},true);
render();
})();
