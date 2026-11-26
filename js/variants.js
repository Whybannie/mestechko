/* Месте4ко · variants.js — показ вариантов дизайна. ?look=1|2|3 включает вариант, ?look=0 возвращает как было.
   Обычные посетители ничего не видят: без параметра и без сохранённого выбора скрипт ничего не делает. */
(function(){
  var KEY='m4.look', names={'0':'Сейчас','1':'Стекло','2':'Краски','3':'Всё вместе'};
  var q=(location.search.match(/[?&]look=([0-3])/)||[])[1];
  var cur=q!==undefined?q:(function(){try{return localStorage.getItem(KEY)}catch(e){return null}})();
  if(cur===null||cur===undefined)return;
  try{localStorage.setItem(KEY,cur)}catch(e){}
  function apply(v){cur=v;try{localStorage.setItem(KEY,v)}catch(e){}
    if(v==='0')document.documentElement.removeAttribute('data-look');else document.documentElement.setAttribute('data-look',v);
    var bs=document.querySelectorAll('.m4look button');for(var i=0;i<bs.length;i++)bs[i].setAttribute('aria-pressed',bs[i].getAttribute('data-v')===v?'true':'false');}
  apply(cur);
  /* цвет категории на карточках */
  function paint(){
    if(typeof PLACES==='undefined'||typeof CAT==='undefined')return;
    var ink={'Погулять':'#0E8577','Поесть':'#9A5F0E','Вдвоём':'#A3366B','С детьми':'#2F5BC4','Поработать':'#5A4AA6','Необычное':'#56751F','Полезное':'#B23A30','Активно':'#172B4D'};
    var cards=document.querySelectorAll('.card[data-id]:not([data-cc])');
    for(var i=0;i<cards.length;i++){var c=cards[i],id=c.getAttribute('data-id'),p=null;
      for(var j=0;j<PLACES.length;j++)if(PLACES[j].id===id){p=PLACES[j];break}
      if(!p)continue;var k=CAT[p.cat]||{};c.setAttribute('data-cc','1');
      c.style.setProperty('--cc',k.c||'#19B7A5');c.style.setProperty('--ct',k.t||'#E3F4F1');c.style.setProperty('--cc-ink',ink[p.cat]||'#172B4D');}
  }
  function boot(){
    var bar=document.createElement('div');bar.className='m4look';bar.setAttribute('role','group');bar.setAttribute('aria-label','Вариант дизайна');
    var h='<span>Вариант дизайна</span>';for(var v in names)h+='<button type="button" data-v="'+v+'" aria-pressed="false">'+names[v]+'</button>';
    bar.innerHTML=h;document.body.appendChild(bar);
    bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b)apply(b.getAttribute('data-v'))});
    apply(cur);paint();
    var g=document.getElementById('grid');if(g&&'MutationObserver'in window)new MutationObserver(paint).observe(g,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
