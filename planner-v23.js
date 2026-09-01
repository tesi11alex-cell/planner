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

  function prepareDayHeaders(root=document){
    const heads = [];
    if(root?.matches?.('.day-head')) heads.push(root);
    if(root?.querySelectorAll) heads.push(...root.querySelectorAll('.day-head'));

    heads.forEach(head => {
      head.setAttribute('role','button');
      head.setAttribute('tabindex','0');
      head.setAttribute('title','Allarga questo giorno');
    });
  }

  function ensureStandardButton(){
    const sidebar = document.querySelector('.desktop-sidebar');
    if(!sidebar || document.getElementById('standardViewBtnV23')) return;

    const button = document.createElement('button');
    button.id = 'standardViewBtnV23';
    button.type = 'button';
    button.className = 'standard-view-btn-v23';
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

  function clearInlineExpansion(card){
    card.classList.remove('v23-expanded');
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
      todo.style.removeProperty('max-width');
      todo.style.removeProperty('width');
    }
  }

  function applyExpandedLayout(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return false;

    const cards = [...grid.querySelectorAll('.day[data-key]')];
    cards.forEach(clearInlineExpansion);

    const standardButton = document.getElementById('standardViewBtnV23');

    if(!desktopMode() || !expandedDayKey){
      standardButton?.classList.remove('active');
      return false;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      standardButton?.classList.remove('active');
      return false;
    }

    selected.classList.add('v23-expanded');

    // Backup inline: così l'espansione funziona anche se il browser mantiene vecchi CSS in cache.
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
      todo.style.setProperty('max-width','none','important');
      todo.style.setProperty('width','100%','important');
    }

    standardButton?.classList.add('active');

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

  function expandDay(card){
    if(!desktopMode() || !card?.dataset?.key) return;
    expandedDayKey = card.dataset.key;
    pendingCalendarDayKey = null;
    applyExpandedLayout();

    requestAnimationFrame(() => {
      card.scrollIntoView({behavior:'smooth',block:'start'});
    });
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

  function selectedCalendarKey(dayNumber){
    const select = document.getElementById('monthSelect');
    if(!select?.value) return null;

    const [yearText,monthText] = select.value.split('-');
    const year = Number(yearText);
    const monthZeroBased = Number(monthText);

    if(!Number.isInteger(year) || !Number.isInteger(monthZeroBased)) return null;

    return `${year}-${pad2(monthZeroBased + 1)}-${pad2(dayNumber)}`;
  }

  // Maiuscola automatica prima degli handler originali del Planner.
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

  // 1) Clic sul riquadro del giorno: basta cliccare sul titolo/data o su un punto vuoto della card.
  document.addEventListener('click', event => {
    if(!desktopMode()) return;

    const calendarButton = event.target.closest('[data-calendar-day]');
    if(calendarButton){
      const dayNumber = Number(calendarButton.dataset.calendarDay);
      const key = selectedCalendarKey(dayNumber);

      if(key){
        pendingCalendarDayKey = key;
        expandedDayKey = key;

        // L'handler originale del mini calendario fa render() in modo asincrono.
        // Attendiamo il nuovo DOM e poi allarghiamo il giorno scelto.
        setTimeout(tryApplyPendingCalendarDay,0);
        setTimeout(tryApplyPendingCalendarDay,80);
        setTimeout(tryApplyPendingCalendarDay,250);
        setTimeout(tryApplyPendingCalendarDay,600);
      }
      return;
    }

    if(event.target.closest('input,textarea,button,select,a,label')) return;

    const card = event.target.closest('.day[data-key]');
    if(!card) return;

    expandDay(card);
  });

  document.addEventListener('keydown', event => {
    if(!desktopMode()) return;
    if(event.key !== 'Enter' && event.key !== ' ') return;

    const header = event.target.closest?.('.day-head');
    if(!header) return;

    event.preventDefault();
    expandDay(header.closest('.day[data-key]'));
  });

  function initialize(){
    ensureStandardButton();
    prepareFields(document);
    prepareDayHeaders(document);
    applyExpandedLayout();

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node => {
          if(node.nodeType !== 1) return;
          prepareFields(node);
          prepareDayHeaders(node);
        });
      }

      ensureStandardButton();

      // Se il Planner ha appena ridisegnato la settimana dopo un click sul mini-calendario.
      if(pendingCalendarDayKey){
        tryApplyPendingCalendarDay();
      }else{
        applyExpandedLayout();
      }
    });

    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('resize',() => {
      applyExpandedLayout();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();