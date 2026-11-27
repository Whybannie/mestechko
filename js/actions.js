/* Месте4ко · карточка места: сегментный переключатель дороги и розовая память */
(function(){
if(window.__m4act||typeof PLACES==='undefined')return;window.__m4act=1;
var MODES={
 pedestrian:{n:'пешком',v:4.8,add:0,acc:'#19B7A5',speed:'2.9s'},
 auto:{n:'на авто',v:26,add:3,acc:'#FF6B5E',speed:'1.2s'},
 mt:{n:'на транспорте',v:17,add:8,acc:'#3D6BD6',speed:'1.9s'}
};
var ORDER=['pedestrian','auto','mt'];
var mode='pedestrian';
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function byId(id){for(var i=0;i<PLACES.length;i++)if(PLACES[i].id===id)return PLACES[i];return null}
function hav(a,b,c,d){
 var R=6371,r=Math.PI/180,dLa=(c-a)*r,dLo=(d-b)*r;
 var x=Math.sin(dLa/2)*Math.sin(dLa/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)*Math.sin(dLo/2);
 return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));
}
function origin(){
 if(window.__m4me&&typeof window.__m4me.lat==='number')return{lat:window.__m4me.lat,lng:window.__m4me.lng,label:'от вас'};
 var c=(typeof CITY!=='undefined'&&CITY.center)||[55.03,82.92];
 return{lat:c[0],lng:c[1],label:'от центра'};
}
function kmTo(p){var o=origin();return hav(o.lat,o.lng,p.lat,p.lng)*1.28}
function link(p){
 var from=window.__m4me?(window.__m4me.lat+','+window.__m4me.lng+'~'):'';
 return 'https://yandex.ru/maps/?rtext='+from+p.lat+','+p.lng+'&rtt='+mode;
}
function metaText(p){
 var km=kmTo(p),M=MODES[mode]||MODES.pedestrian;
 var min=Math.max(2,Math.round(km/M.v*60+M.add));
 var dist=km<1?Math.round(km*1000)+' м':km.toFixed(1).replace('.',',')+' км';
 return '≈ '+dist+' · '+min+' мин '+M.n+' · '+origin().label;
}

/* ---- сегментный переключатель: ползунок загорается цветом способа ---- */
function paintModes(hit){
 var wrap=document.getElementById('rtModes');if(!wrap)return;
 var thumb=wrap.querySelector('.rt-thumb');
 if(!thumb){
  thumb=document.createElement('span');
  thumb.className='rt-thumb';thumb.setAttribute('aria-hidden','true');
  wrap.insertBefore(thumb,wrap.firstChild);
 }
 wrap.setAttribute('data-mode',mode);
 wrap.setAttribute('role','radiogroup');
 wrap.setAttribute('aria-label','Способ добраться');
 var btns=wrap.querySelectorAll('.rt-mode'),act=null;
 for(var i=0;i<btns.length;i++){
  var b=btns[i],on=b.getAttribute('data-rtt')===mode;
  b.classList.toggle('on',on);
  b.setAttribute('role','radio');
  b.setAttribute('aria-checked',String(on));
  b.setAttribute('tabindex',on?'0':'-1');
  if(on)act=b;
 }
 var acts=document.querySelector('.dlg-actions');
 if(acts){
  acts.setAttribute('data-mode',mode);
  acts.style.setProperty('--rt-acc',MODES[mode].acc);
  acts.style.setProperty('--rt-speed',MODES[mode].speed);
 }
 if(act&&act.offsetWidth){
  thumb.style.width=act.offsetWidth+'px';
  thumb.style.height=act.offsetHeight+'px';
  thumb.style.transform='translate('+act.offsetLeft+'px,'+act.offsetTop+'px)';
  thumb.classList.add('ready');
  if(hit&&!reduce){thumb.classList.remove('hit');void thumb.offsetWidth;thumb.classList.add('hit')}
 }
}
function syncRoute(hit){
 paintModes(hit);
 var p=byId(typeof currentId!=='undefined'?currentId:null);
 var a=document.getElementById('pdRoute'),m=document.getElementById('pdRouteMeta');
 if(!p){if(m)m.textContent='выберите способ';return}
 if(a)a.href=link(p);
 if(m){
  m.textContent=metaText(p);
  if(hit&&!reduce){m.classList.remove('flash');void m.offsetWidth;m.classList.add('flash')}
 }
}
function setMode(next,hit){
 if(!MODES[next]||next===mode){if(next===mode)paintModes(true);return}
 mode=next;syncRoute(hit!==false);
}
var wrap=document.getElementById('rtModes');
if(wrap){
 wrap.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('.rt-mode'):null;if(!b)return;
  e.preventDefault();
  setMode(b.getAttribute('data-rtt'),true);
  b.focus({preventScroll:true});
 });
 wrap.addEventListener('keydown',function(e){
  var i=ORDER.indexOf(mode),n=null;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')n=ORDER[(i+1)%ORDER.length];
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=ORDER[(i+ORDER.length-1)%ORDER.length];
  else if(e.key===' '||e.key==='Enter'){e.preventDefault();paintModes(true);return}
  if(!n)return;
  e.preventDefault();setMode(n,true);
  var b=wrap.querySelector('.rt-mode[data-rtt="'+n+'"]');if(b)b.focus({preventScroll:true});
 });
}

/* ---- розовая кнопка памяти ---- */
pdSave=function(){
 var b=document.getElementById('pdSave');if(!b)return;
 var id=(typeof currentId!=='undefined')?currentId:null;
 var on=(typeof S!=='undefined')&&S.saved.has(id);
 b.classList.toggle('on',on);
 b.setAttribute('aria-pressed',String(on));
 var e=b.querySelector('.fav-emoji'),l=b.querySelector('.fav-label');
 if(e)e.textContent=on?'💖':'🤍';
 if(l)l.textContent=on?'В избранном':'Запомнить место';
};
function burst(btn){
 if(reduce)return;
 var E=['💖','✨','💗','🌸','💫','🩷','💞'];
 for(var i=0;i<9;i++){
  var s=document.createElement('span');
  s.className='fav-pop';s.textContent=E[i%E.length];
  s.style.setProperty('--dx',(Math.random()*130-65).toFixed(0)+'px');
  s.style.setProperty('--dy',(-46-Math.random()*72).toFixed(0)+'px');
  s.style.setProperty('--rz',(Math.random()*130-65).toFixed(0)+'deg');
  s.style.animationDelay=(i*30)+'ms';
  btn.appendChild(s);
  (function(el){setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},1200)})(s);
 }
}
var sb=document.getElementById('pdSave');
if(sb)sb.addEventListener('click',function(){
 if(typeof S!=='undefined'&&S.saved.has(currentId)){
  burst(sb);sb.classList.add('pulse');
  setTimeout(function(){sb.classList.remove('pulse')},720);
 }
});

/* ---- открытие карточки ---- */
var _open=openPlace;
openPlace=function(id){
 _open(id);
 var p=byId(id);if(!p)return;
 mode=kmTo(p)>2.5?'auto':'pedestrian';
 syncRoute(false);pdSave();
 requestAnimationFrame(function(){paintModes(false);syncRoute(false)});
 setTimeout(function(){paintModes(false)},160);
};
var rz;
window.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){paintModes(false)},120)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){paintModes(false)});
window.addEventListener('online',function(){syncRoute(false)});
paintModes(false);
})();
