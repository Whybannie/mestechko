/* Месте4ко · smart.js — «Умный подбор» и «Популярное».
   Умный подбор считается прямо в браузере посетителя: время суток, день недели, что открыто сейчас,
   какие места человек открывал и сохранял. Ничего никуда не отправляется.
   Популярное: сначала платные размещения из PROMO (с пометкой «Реклама» по закону о рекламе),
   затем места с наибольшим числом отзывов в 2ГИС (PLACE_POP в data.js города). */
(function(){
  if(typeof PLACES==='undefined')return;
  var PROF_KEY='m4.smart.'+((typeof CITY!=='undefined'&&CITY.slug)||'x');
  function rd(){try{return JSON.parse(localStorage.getItem(PROF_KEY)||'{}')}catch(e){return {}}}
  function wr(o){try{localStorage.setItem(PROF_KEY,JSON.stringify(o))}catch(e){}}
  var prof=rd(); prof.cat=prof.cat||{}; prof.comp=prof.comp||{}; prof.mood=prof.mood||{}; prof.seen=prof.seen||[];
  function learn(p,w){if(!p)return;w=w||1;
    prof.cat[p.cat]=(prof.cat[p.cat]||0)+w;
    (p.company||[]).forEach(function(c){prof.comp[c]=(prof.comp[c]||0)+w});
    (p.mood||[]).forEach(function(m){prof.mood[m]=(prof.mood[m]||0)+w});
    prof.seen=[p.id].concat(prof.seen.filter(function(x){return x!==p.id})).slice(0,30);wr(prof);}
  function byId(id){for(var i=0;i<PLACES.length;i++)if(PLACES[i].id===id)return PLACES[i];return null}
  /* учимся на открытых карточках */
  if(typeof window.openPlace==='function'){var orig=window.openPlace;window.openPlace=function(id){try{learn(byId(id),1)}catch(e){}return orig.apply(this,arguments)}}
  var POP=(typeof PLACE_POP!=='undefined')?PLACE_POP:{};
  var PRM=(typeof PROMO!=='undefined')?PROMO:[];
  function isOpen(p){try{return typeof openNow==='function'?openNow(p):null}catch(e){return null}}
  function fmtN(n){return n>=1000?(Math.round(n/100)/10+'').replace('.',',')+' тыс.':String(n)}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

  /* ── умный подбор ── */
  function smartPick(){
    var now=new Date(),h=now.getHours(),dow=now.getDay(),weekend=dow===0||dow===6;
    var slot=h>=6&&h<11?'morning':h<16&&h>=11?'day':h>=16&&h<22?'evening':'night';
    var tot=0,k;for(k in prof.cat)tot+=prof.cat[k];
    var saved=(typeof S!=='undefined'&&S.saved)?S.saved:new Set();
    var scored=PLACES.map(function(p){
      var s=0,why=[],t=p.tags||[],txt=(p.name+' '+p.lead+' '+(p.feat||[]).join(' ')).toLowerCase();
      var o=isOpen(p);
      if(o===true){s+=3;why.push('Открыто сейчас')} else if(o===false){s-=6}
      if(slot==='morning'&&(t.indexOf('coffee')>=0||/завтрак/.test(txt))){s+=3;why.push('Хорошо для утра')}
      if(slot==='day'&&/ланч|обед/.test(txt+' '+(p.budgetText||'').toLowerCase())){s+=2;why.push('Есть бизнес-ланч')}
      if(slot==='evening'&&(t.indexOf('two')>=0||p.cat==='Вдвоём')){s+=2;why.push('Для вечера')}
      if(slot==='night'&&t.indexOf('late')>=0&&p.indoor){s+=4;why.push('Работает ночью')}
      if(weekend&&h<19&&(p.company||[]).indexOf('kids')>=0){s+=1.5;why.push('На выходные')}
      if(tot>0){var a=(prof.cat[p.cat]||0)/tot;(p.company||[]).forEach(function(c){a+=(prof.comp[c]||0)/tot*.35});
        if(a>.25){s+=a*5;why.push('Похоже на то, что вы смотрели')}}
      if(saved.has&&saved.has(p.id)){s-=2}
      if(prof.seen.indexOf(p.id)>=0&&prof.seen.indexOf(p.id)<6){s-=3}
      if(slot==='night'&&!p.indoor){s-=3}
      if(p.cat==='Полезное'){s-=50}
      var pp=POP[p.id];if(pp){s+=Math.min(3,Math.log10(1+pp[0]))*.8+(pp[1]>=4.9?.6:0)}
      s+=((p.id.charCodeAt(0)+now.getDate())%7)/20; /* лёгкое разнообразие изо дня в день */
      return {p:p,s:s,why:why};
    }).sort(function(a,b){return b.s-a.s});
    var out=[],per={};for(var i=0;i<scored.length&&out.length<8;i++){var c=scored[i].p.cat;if((per[c]||0)>=2)continue;per[c]=(per[c]||0)+1;out.push(scored[i])}
    return {list:out,slot:slot,learned:tot>0};
  }
  function tile(p,note,ad){
    var c=(typeof CAT!=='undefined'&&CAT[p.cat])||{c:'#19B7A5',t:'#E3F4F1'};
    var o=isOpen(p),st=o===true?'<span class="sm-open">Открыто</span>':o===false?'<span class="sm-open off">Закрыто</span>':'';
    return '<button type="button" class="sm-card" data-open="'+esc(p.id)+'" style="--cc:'+c.c+';--ct:'+c.t+'">'+
      '<span class="sm-ph">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'<span class="sm-cat">'+esc(p.cat)+'</span>'+(ad?'<span class="sm-ad">Реклама</span>':'')+'</span>'+
      '<span class="sm-b"><b>'+esc(p.name)+'</b><span class="sm-lead">'+esc(p.lead)+'</span>'+
      '<span class="sm-meta"><span>'+esc(p.budget&&p.budget[1]===0?'Бесплатно':p.budgetText)+'</span>'+st+'</span>'+
      (note?'<span class="sm-why">'+note+'</span>':'')+'</span></button>';
  }
  function bind(root){root.addEventListener('click',function(e){var b=e.target.closest('[data-open]');if(b&&typeof window.openPlace==='function')window.openPlace(b.getAttribute('data-open'))})}

  function renderSmart(){
    var host=document.getElementById('smartRail');if(!host)return;
    var r=smartPick(),title={morning:'на утро',day:'на день',evening:'на вечер',night:'на ночь'}[r.slot];
    host.querySelector('.sm-sub').textContent='Подобрано '+title+(r.learned?' — с учётом того, что вы смотрели':'')+'. Считается прямо в вашем браузере, мы ничего не собираем.';
    host.querySelector('.sm-rail').innerHTML=r.list.map(function(x){return tile(x.p,x.why.slice(0,2).join(' · '))}).join('');
  }
  function renderPopular(){
    var host=document.getElementById('popular');if(!host)return;
    var ads=PRM.filter(function(a){return byId(a.id)&&(!a.until||a.until>=new Date().toISOString().slice(0,10))});
    var adIds={};ads.forEach(function(a){adIds[a.id]=1});
    var top=PLACES.filter(function(p){return POP[p.id]&&!adIds[p.id]&&p.cat!=='Полезное'}).sort(function(a,b){return POP[b.id][0]-POP[a.id][0]}).slice(0,12);
    if(!ads.length&&!top.length){host.hidden=true;return}
    var html=ads.map(function(a){var p=byId(a.id);return tile(p,'Реклама · '+esc(a.advertiser||'')+(a.erid?' · erid: '+esc(a.erid):''),true)}).join('')+
      top.map(function(p){var pp=POP[p.id];return tile(p,'★ '+String(pp[1]).replace('.',',')+' · '+fmtN(pp[0])+' отзывов в 2ГИС')}).join('');
    host.querySelector('.sm-rail').innerHTML=html;
  }
  function section(id,num,title,sub,extra){
    var s=document.createElement('section');s.className='sec sm-sec';s.id=id;
    s.innerHTML='<div class="wrap"><div class="sec-head"><span class="sec-num">'+num+'</span><h2 class="sec-title">'+title+'</h2><p class="deck sm-sub">'+sub+'</p></div>'+
      '<div class="sm-rail" role="list"></div>'+(extra||'')+'</div>';
    bind(s);return s;
  }
  function boot(){
    var col=document.getElementById('collections'),places=document.getElementById('places');
    if(col&&!document.getElementById('smartRail')){
      var sm=section('smartRail','Умный подбор','Подобрано для вас','');
      sm.classList.add('sm-smart');col.parentNode.insertBefore(sm,col);
    }
    if(places&&!document.getElementById('popular')&&(Object.keys(POP).length||PRM.length)){
      var pop=section('popular','Популярное','Чаще всего выбирают','Места, о которых в городе говорят больше всего: по числу отзывов в 2ГИС. Платные размещения всегда помечены «Реклама».',
        '<p class="sm-biz">Хотите, чтобы ваше заведение было здесь? <a href="#suggest">Напишите нам</a> — размещение помечается как реклама.</p>');
      places.parentNode.insertBefore(pop,places);
      /* пункт меню */
      var nav=document.querySelector('.hd nav');
      if(nav&&!nav.querySelector('[data-nav="popular"]')){var a=document.createElement('a');a.href='#popular';a.setAttribute('data-nav','popular');a.textContent='Популярное';nav.insertBefore(a,nav.firstChild)}
    }
    renderSmart();renderPopular();
    /* мобильная панель: Места · Популярное · Подбор · Карта · Избранное */
    var tryNav=function(){var mn=document.getElementById('mobileNav');if(!mn)return false;
      if(document.getElementById('popular')&&!mn.querySelector('[data-nav="popular"]')){
        var a=document.createElement('a');a.href='#popular';a.className='mnav-i';a.setAttribute('data-nav','popular');
        a.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-6 0-8z"/></svg><span>Популярное</span>';
        var first=mn.querySelector('[data-nav="places"]');mn.insertBefore(a,first?first.nextSibling:mn.firstChild);}
      var c=mn.querySelector('[data-nav="collections"]');if(c){c.setAttribute('href','#smartRail');var sp=c.querySelector('span');if(sp)sp.textContent='Подбор'}
      return true};
    if(!tryNav()){var n=0,t=setInterval(function(){if(tryNav()||++n>20)clearInterval(t)},250)}
    setInterval(renderSmart,10*60*1000);
    window.addEventListener('m4:photos',function(){renderSmart();renderPopular()});
    setTimeout(function(){renderSmart();renderPopular()},2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
