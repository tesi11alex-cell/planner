(() => {
  'use strict';

  let expandedDayKey = null;
  let pendingCalendarDayKey = null;
  let fitTimer = null;

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

  function resizeTextarea(textarea){
    if(!textarea) return;
    const minHeight =
      textarea.classList.contains('hour-input') ? 12 :
      textarea.classList.contains('todo-text') ? 12 :
      textarea.classList.contains('organizer-note-input') ? 15 :
      12;

    textarea.style.height = '0px';
    textarea.style.height = Math.max(textarea.scrollHeight,minHeight) + 'px';
  }

  function resizeAllTextareas(root=document){
    if(root?.matches?.('textarea')){
      resizeTextarea(root);
    }
    root?.querySelectorAll?.(
      '.hour-input, .todo-text, .organizer-note-input'
    ).forEach(resizeTextarea);
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
    resizeAllTextareas(root);
  }

  function ensureStandardButton(){
    const sidebar = document.querySelector('.desktop-sidebar');
    if(!sidebar || document.getElementById('standardViewBtnV25')) return;

    const button = document.createElement('button');
    button.id = 'standardViewBtnV25';
    button.type = 'button';
    button.className = 'standard-view-btn-v25';
    button.textContent = '↺ Vista standard';
    button.title = 'Torna alla visualizzazione compatta';

    const firstCard = sidebar.querySelector('.side-card');
    sidebar.insertBefore(button, firstCard || sidebar.firstChild);

    button.addEventListener('click', () => {
      expandedDayKey = null;
      pendingCalendarDayKey = null;
      document.body.classList.remove('v25-expanded-active');
      applyExpandedLayout();
      fitStandardView();
      document.getElementById('weekGrid')?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    });
  }

  function clearExpansion(card){
    card.classList.remove('v25-expanded');
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

  function clearStandardScale(){
    const layout = document.querySelector('.planner-layout');
    if(!layout) return;
    layout.style.removeProperty('zoom');
  }

  function fitStandardView(){
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => {
      if(!desktopMode() || expandedDayKey) return;

      const layout = document.querySelector('.planner-layout');
      const week = document.getElementById('weekGrid');
      if(!layout || !week) return;

      layout.style.zoom = '1';
      resizeAllTextareas(document);

      requestAnimationFrame(() => {
        const top = layout.getBoundingClientRect().top;
        const available = Math.max(300, window.innerHeight - top - 12);
        const needed = Math.max(layout.scrollHeight, week.scrollHeight);

        let scale = needed > available ? available / needed : 1;
        scale = Math.min(1, Math.max(0.62, scale));

        if(scale < 0.995){
          layout.style.zoom = String(scale);
        }else{
          layout.style.zoom = '1';
        }

        resizeAllTextareas(document);
      });
    }, 80);
  }

  function centerExpandedCard(card){
    if(!card) return;

    const center = () => {
      card.scrollIntoView({
        behavior:'smooth',
        block:'center',
        inline:'nearest'
      });
    };

    requestAnimationFrame(center);
    setTimeout(center,120);
  }

  function applyExpandedLayout(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return false;

    const cards = [...grid.querySelectorAll('.day[data-key]')];
    cards.forEach(clearExpansion);

    const button = document.getElementById('standardViewBtnV25');

    if(!desktopMode() || !expandedDayKey){
      document.body.classList.remove('v25-expanded-active');
      button?.classList.remove('active');
      resizeAllTextareas(document);
      return false;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      document.body.classList.remove('v25-expanded-active');
      button?.classList.remove('active');
      return false;
    }

    clearStandardScale();
    document.body.classList.add('v25-expanded-active');

    selected.classList.add('v25-expanded');

    /* Backup inline per evitare problemi di cache CSS */
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

    resizeAllTextareas(selected);
    return true;
  }

  function expandDay(card){
    if(!desktopMode() || !card?.dataset?.key) return;

    expandedDayKey = card.dataset.key;
    pendingCalendarDayKey = null;

    applyExpandedLayout();
    resizeAllTextareas(card);
    centerExpandedCard(card);
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
    resizeAllTextareas(card);
    centerExpandedCard(card);
  }

  /* Maiuscola automatica + textarea sempre alte abbastanza per mostrare tutto */
  document.addEventListener('input', event => {
    const target = event.target;

    if(target?.matches?.(
      '.hour-input, .todo-text, [data-add-input], #quickTaskText, #mobileQuickTaskText, .organizer-note-input'
    )){
      const before = target.value;
      const after = capitalizeFirstLetter(before);

      if(after !== before){
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = after;
        try{
          if(start !== null && end !== null){
            target.setSelectionRange(start,end);
          }
        }catch(error){}
      }
    }

    if(target?.matches?.('.hour-input, .todo-text, .organizer-note-input')){
      resizeTextarea(target);
      if(!expandedDayKey) fitStandardView();
    }
  }, true);

  /*
    Click su QUALSIASI parte del giorno:
    titolo, data, ore, testo delle ore, Cose da fare, checkbox, pulsanti.
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

    expandDay(card);
  });

  function initialize(){
    ensureStandardButton();
    prepareFields(document);
    applyExpandedLayout();

    const observer = new MutationObserver(mutations => {
      let changed = false;

      for(const mutation of mutations){
        mutation.addedNodes.forEach(node => {
          if(node.nodeType !== 1) return;
          prepareFields(node);
          changed = true;
        });
      }

      ensureStandardButton();

      if(pendingCalendarDayKey){
        tryApplyPendingCalendarDay();
      }else if(expandedDayKey){
        applyExpandedLayout();
      }else if(changed){
        fitStandardView();
      }
    });

    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('resize',() => {
      resizeAllTextareas(document);
      if(expandedDayKey){
        applyExpandedLayout();
      }else{
        fitStandardView();
      }
    });

    setTimeout(() => {
      resizeAllTextareas(document);
      fitStandardView();
    },250);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();