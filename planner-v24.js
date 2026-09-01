(() => {
  'use strict';

  let expandedDayKey = null;
  let pendingCalendarDayKey = null;

  const desktopMode = () => window.matchMedia('(min-width:1101px)').matches;

  function pad2(n){
    return String(n).padStart(2,'0');
  }

  function capitalizeFirstLetter(value){
    const chars = Array.from(String(value ?? ''));
    const index = chars.findIndex(ch => /\p{L}/u.test(ch));
    if(index < 0) return chars.join('');
    chars[index] = chars[index].toLocaleUpperCase('it-IT');
    return chars.join('');
  }

  function prepareFields(root=document){
    const selector = [
      '.hour-input',
      '.todo-text',
      '[data-add-input]',
      '#quickTaskText',
      '#mobileQuickTaskText',
      '.organizer-note-input'
    ].join(',');

    const fields = [];
    if(root?.matches?.(selector)) fields.push(root);
    if(root?.querySelectorAll) fields.push(...root.querySelectorAll(selector));

    fields.forEach(field => field.setAttribute('autocapitalize','sentences'));
  }

  function ensureStandardButton(){
    const sidebar = document.querySelector('.desktop-sidebar');
    if(!sidebar || document.getElementById('standardViewBtnV24')) return;

    const button = document.createElement('button');
    button.id = 'standardViewBtnV24';
    button.type = 'button';
    button.className = 'standard-view-btn-v24';
    button.textContent = '↺ Vista standard';
    button.title = 'Torna alla visualizzazione normale';

    const firstCard = sidebar.querySelector('.side-card');
    sidebar.insertBefore(button, firstCard || sidebar.firstChild);

    button.addEventListener('click', () => {
      expandedDayKey = null;
      pendingCalendarDayKey = null;
      applyExpandedLayout();
      document.getElementById('weekGrid')?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    });
  }

  function clearExpansion(card){
    card.classList.remove('v24-expanded');

    card.style.removeProperty('grid-column');
    card.style.removeProperty('width');
    card.style.removeProperty('max-width');

    const body = card.querySelector('.day-body');
    if(body){
      body.style.removeProperty('display');
      body.style.removeProperty('grid-template-columns');
      body.style.removeProperty('gap');
    }

    const todo = card.querySelector('.todo-box');
    if(todo){
      todo.style.removeProperty('width');
      todo.style.removeProperty('max-width');
    }
  }

  function applyExpandedLayout(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return false;

    const cards = [...grid.querySelectorAll('.day[data-key]')];
    cards.forEach(clearExpansion);

    const button = document.getElementById('standardViewBtnV24');

    if(!desktopMode() || !expandedDayKey){
      button?.classList.remove('active');
      return false;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      button?.classList.remove('active');
      return false;
    }

    selected.classList.add('v24-expanded');

    /* Backup inline: anche con CSS vecchio in cache, il giorno si allarga. */
    selected.style.setProperty('grid-column','1 / -1','important');
    selected.style.setProperty('width','100%','important');
    selected.style.setProperty('max-width','none','important');

    const body = selected.querySelector('.day-body');
    if(body){
      body.style.setProperty('display','grid','important');
      body.style.setProperty(
        'grid-template-columns',
        'minmax(0,1fr) minmax(0,1fr)',
        'important'
      );
      body.style.setProperty('gap','24px','important');
    }

    const todo = selected.querySelector('.todo-box');
    if(todo){
      todo.style.setProperty('width','100%','important');
      todo.style.setProperty('max-width','none','important');
    }

    button?.classList.add('active');

    requestAnimationFrame(() => {
      selected.querySelectorAll('.hour-input').forEach(field => {
        if(typeof window.autoGrow === 'function') window.autoGrow(field,27);
      });
      selected.querySelectorAll('.todo-text').forEach(field => {
        if(typeof window.autoGrow === 'function') window.autoGrow(field,18);
      });
    });

    return true;
  }

  function expandDay(card, scroll=false){
    if(!desktopMode() || !card?.dataset?.key) return;

    expandedDayKey = card.dataset.key;
    pendingCalendarDayKey = null;
    applyExpandedLayout();

    if(scroll){
      requestAnimationFrame(() => {
        card.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
  }

  function selectedCalendarKey(dayNumber){
    const select = document.getElementById('monthSelect');
    if(!select?.value) return null;

    const [yearText,monthText] = select.value.split('-');
    const year = Number(yearText);
    const monthZeroBased = Number(monthText);

    if(!Number.isInteger(year) || !Number.isInteger(monthZeroBased)) return null;

    return `${year}-${pad2(monthZeroBased + 1)}-${pad2(dayNumber)}`;
  }

  function tryApplyPendingCalendarDay(){
    if(!pendingCalendarDayKey || !desktopMode()) return;

    const card = document.querySelector(
      `.day[data-key="${pendingCalendarDayKey}"]`
    );

    if(!card) return;

    expandedDayKey = pendingCalendarDayKey;
    pendingCalendarDayKey = null;
    applyExpandedLayout();

    requestAnimationFrame(() => {
      card.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  /* Prima lettera maiuscola prima del salvataggio originale del Planner. */
  document.addEventListener('input', event => {
    const target = event.target;
    if(!target?.matches?.(
      '.hour-input, .todo-text, [data-add-input], #quickTaskText, #mobileQuickTaskText, .organizer-note-input'
    )) return;

    const before = target.value;
    const after = capitalizeFirstLetter(before);
    if(after === before) return;

    const start = target.selectionStart;
    const end = target.selectionEnd;
    target.value = after;

    try{
      if(start !== null && end !== null){
        target.setSelectionRange(start,end);
      }
    }catch(error){}
  }, true);

  /*
    CLICK SU QUALSIASI PARTE DEL GIORNO:
    - titolo/data
    - righe degli orari
    - casella di testo dell'orario
    - Cose da fare
    - textarea delle Cose da fare
    - pulsanti/checkbox
    Non blocchiamo l'azione originale: prima si usa il controllo, poi si allarga la card.
  */
  document.addEventListener('click', event => {
    if(!desktopMode()) return;

    const calendarButton = event.target.closest('[data-calendar-day]');
    if(calendarButton){
      const dayNumber = Number(calendarButton.dataset.calendarDay);
      const key = selectedCalendarKey(dayNumber);

      if(key){
        pendingCalendarDayKey = key;
        expandedDayKey = key;

        /* Il mini-calendario originale ricrea la settimana in modo asincrono. */
        setTimeout(tryApplyPendingCalendarDay,0);
        setTimeout(tryApplyPendingCalendarDay,60);
        setTimeout(tryApplyPendingCalendarDay,180);
        setTimeout(tryApplyPendingCalendarDay,400);
        setTimeout(tryApplyPendingCalendarDay,800);
      }
      return;
    }

    const card = event.target.closest('.day[data-key]');
    if(!card) return;

    /* Anche cliccando dentro Orari o Cose da fare si espande. */
    expandDay(card,false);
  });

  function initialize(){
    ensureStandardButton();
    prepareFields(document);
    applyExpandedLayout();

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node => {
          if(node.nodeType !== 1) return;
          prepareFields(node);
        });
      }

      ensureStandardButton();

      if(pendingCalendarDayKey){
        tryApplyPendingCalendarDay();
      }else{
        applyExpandedLayout();
      }
    });

    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('resize',applyExpandedLayout);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();