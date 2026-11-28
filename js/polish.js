/* Месте4ко · время суток в подборе, живые подписи, чистый текст */
(function(){
if(window.__m4polish||typeof PLACES==='undefined')return;window.__m4polish=1;

var SLOP=[
 /считается прямо в (?:вашем|этом) браузере[^.!?]*/gi,
 /мы ничего не собираем[^.!?]*/gi,
 /интересы копятся только[^.!?]*/gi,
 /(?:всё |данные )?хранится только в (?:этом|вашем) браузере[^.!?]*/gi,
 /ничего не отправляем[^.!?]*/gi,
 /это не покидает (?:ваше )?устройство[^.!?]*/gi
];
function tidy(s){
 return s.replace(/\s{2,}/g,' ').replace(/\s+([,.!?;:])/g,'$1').replace(/^[\s,.;:—–-]+/,'').replace(/[\s—–-]+$/,'').trim();
}
function scrub(root){
 if(!root||!document.createTreeWalker)return;
 var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false),n,batch=[];
 while((n=w.nextNode()))batch.push(n);
 batch.forEach(function(t){
  var v=t.nodeValue;if(!v||v.length<10)return;
  var low=v.toLowerCase(),hit=false;
  for(var i=0;i<SLOP.length;i++){SLOP[i].lastIndex=0;if(SLOP[i].test(low)){hit=true;break}}
  if(!hit)return;
  var out=v;
  SLOP.forEach(function(r){out=out.replace(r,'')});
  out=tidy(out);
  if(out!==v)t.nodeValue=out;
 });
}

function rec(){
 var nm=(typeof CITY!=='undefined'&&CITY.name)||'';
 var list=window.M4_CITIES||[];
 for(var i=0;i<list.length;i++)if(list[i].name===nm)return list[i];
 return null;
}
function cityNow(){
 var r=rec(),tz=(typeof CITY!=='undefined'&&CITY.tz)||(r&&r.tz)||null;
 var utc=(typeof CITY!=='undefined'&&typeof CITY.utc==='number')?CITY.utc:((r&&typeof r.utc==='number')?r.utc:3);
 var d=new Date();
 if(tz){
  try{
   var p=new Intl.DateTimeFormat('ru-RU',{timeZone:tz,hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
   var h=0,m=0;
   p.forEach(function(x){if(x.type==='hour')h=+x.value;if(x.type==='minute')m=+x.value});
   return{h:h,m:m};
  }catch(e){}
 }
 var u=new Date(d.getTime()+d.getTimezoneOffset()*60000+utc*3600000);
 return{h:u.getHours(),m:u.getMinutes()};
}
function bucket(h){
 if(h>=5&&h<11)return{t:'Утро',acc:'утро',e:'🌅'};
 if(h>=11&&h<17)return{t:'День',acc:'день',e:'☀️'};
 if(h>=17&&h<22)return{t:'Вечер',acc:'вечер',e:'🌆'};
 return{t:'Ночь',acc:'ночь',e:'🌙'};
}
var CO={two:'вдвоём',kids:'с детьми',friends:'с друзьями',solo:'один'};
function topInterests(){
 var o={};try{o=JSON.parse(localStorage.getItem('m4.aff')||'{}')}catch(e){}
 var now=Date.now(),HALF=14*864e5,a=[];
 for(var k in o){
  var r=o[k];if(!r||!r.v)continue;
  if(k.indexOf('cat:')!==0&&k.indexOf('co:')!==0)continue;
  a.push([k,r.v*Math.pow(0.5,(now-(r.t||now))/HALF)]);
 }
 a.sort(function(x,y){return y[1]-x[1]});
 var out=[],seen={};
 a.forEach(function(x){
  if(out.length>=3)return;
  var i=x[0].indexOf(':'),kind=x[0].slice(0,i),val=x[0].slice(i+1);
  var label=kind==='co'?(CO[val]||val):val;
  if(seen[label])return;seen[label]=1;out.push(label);
 });
 return out;
}

var cap=null,lastKey='';
function paintCap(){
 var head=document.querySelector('.results-head');if(!head||!head.parentNode)return;
 if(!cap||!cap.parentNode){
  cap=document.createElement('div');cap.className='pop-cap';cap.id='popCap';
  head.parentNode.insertBefore(cap,head.nextSibling);
 }
 var b=bucket(cityNow().h),r=rec();
 var prep=(r&&r.prep)||(typeof CITY!=='undefined'&&CITY.name)||'городе';
 var total=PLACES.length,open=0;
 for(var i=0;i<PLACES.length;i++){if(typeof openNow==='function'&&openNow(PLACES[i])===true)open++}
 var word=(typeof pw==='function')?pw(total):'мест';
 var meta=total+' '+word+' · '+open+' открыто сейчас';
 var pop=!!window.__m4Pop,ints=topInterests();
 var lead=pop?('Подобрано на '+b.acc):(b.t+' в '+prep);
 var html='<span class="pc-emoji" aria-hidden="true">'+b.e+'</span><b>'+lead+'</b>';
 if(pop)html+='<span class="pc-int">'+(ints.length?'чаще смотрите: '+ints.join(', '):'выбор редакции')+'</span>';
 html+='<span class="pc-meta">'+meta+'</span>';
 if(html!==lastKey){cap.innerHTML=html;lastKey=html}
}

var nums=document.querySelectorAll('.sec-num');
for(var i=0;i<nums.length;i++){
 nums[i].textContent=nums[i].textContent.replace(/^\s*\d+\s*[/·]\s*/,'').trim();
}

var _render=render;
render=function(){_render();paintCap();scrub(document.getElementById('places'))};

function findPop(){
 var e=document.querySelectorAll('button,a');
 for(var i=0;i<e.length;i++)if(/популярн/i.test(e[i].textContent||''))return e[i];
 return null;
}
var pb=findPop();
if(pb)pb.addEventListener('click',function(){
 setTimeout(function(){
  lastKey='';paintCap();
  if(typeof toast!=='function')return;
  var b=bucket(cityNow().h),ints=topInterests();
  if(window.__m4Pop){
   toast('Подобрано на '+b.acc+(ints.length?' · чаще смотрите: '+ints.join(', '):' · выбор редакции'),'Сбросить',function(){
    try{localStorage.removeItem('m4.aff')}catch(e){}
    lastKey='';paintCap();toast('Интересы сброшены');
   });
  }else{
   toast('Обычный порядок · '+b.t.toLowerCase()+' в городе');
  }
 },0);
});

var pl=document.getElementById('places');
if(pl&&'MutationObserver'in window){
 new MutationObserver(function(){scrub(pl)}).observe(pl,{childList:true,subtree:true,characterData:true});
}
scrub(document.getElementById('main'));
paintCap();
setInterval(function(){if(!document.hidden){lastKey='';paintCap()}},60000);
document.addEventListener('visibilitychange',function(){if(!document.hidden){lastKey='';paintCap()}});
})();
