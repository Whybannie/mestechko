/* Месте4ко · карточка места: маршрут с расчётом и розовое «Запомнить место» */
(function(){
if(window.__m4act||typeof PLACES==='undefined')return;window.__m4act=1;
var MODES={pedestrian:{n:'пешком',v:4.8,add:0},auto:{n:'на авто',v:26,add:3},mt:{n:'на транспорте',v:17,add:8}};
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
function meta(p){
 var km=kmTo(p),M=MODES[mode]||MODES.pedestrian;
 var min=Math.max(2,Math.round(km/M.v*60+M.add));
 var dist=km<1?Math.round(km*1000)+' м':km.toFixed(1).replace('.',',')+' км';
 return '≈ '+dist+' · '+min+' мин '+M.n+' · '+origin().label;
}
function syncRoute(){
 var p=byId(typeof currentId!=='undefined'?currentId:null);if(!p)return;
 var a=document.getElementById('pdRoute');if(a)a.href=link(p);
 var m=document.getElementById('pdRouteMeta');if(m)m.textContent=meta(p);
 var chips=document.querySelectorAll('#rtModes .rt-mode');
 for(var i=0;i<chips.length;i++)chips[i].classList.toggle('on',chips[i].getAttribute('data-rtt')===mode);
}
var modes=document.getElementById('rtModes');
if(modes)modes.addEventListener('click',function(e){
 var b=e.target.closest?e.target.closest('.rt-mode'):null;if(!b)return;
 mode=b.getAttribute('data-rtt')||'pedestrian';syncRoute();
});

/* розовая кнопка памяти */
pdSave=function(){
 var b=document.getElementById('pdSave');if(!b)return;
 var on=(typeof S!=='undefined')&&S.saved.has(typeof currentId!=='undefined'?currentId:null);
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

/* при открытии карточки: считаем дорогу и выбираем способ */
var _open=openPlace;
openPlace=function(id){
 _open(id);
 var p=byId(id);if(!p)return;
 mode=kmTo(p)>2.5?'auto':'pedestrian';
 syncRoute();pdSave();
};
window.addEventListener('online',syncRoute);
})();
