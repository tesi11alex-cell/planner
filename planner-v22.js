(() => {
  'use strict';

  let expandedDayKey = null;
  const desktopMode = () => window.matchMedia('(min-width:1101px)').matches;

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
    if(!sidebar || document.getElementById('standardViewBtnV22')) return;

    const button = document.createElement('button');
    button.id = 'standardViewBtnV22';
    button.type = 'button';
    button.className = 'standard-view-btn-v22';
    button.textContent = '↺ Vista standard';
    button.title = 'Torna alla visualizzazione normale';

    const firstCard = sidebar.querySelector('.side-card');
    sidebar.insertBefore(button, firstCard || sidebar.firstChild);

    button.addEventListener('click', () => {
      expandedDayKey = null;
      applyExpandedLayout();
      document.getElementById('weekGrid')?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    });
  }

  function applyExpandedLayout(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return;

    const cards = [...grid.querySelectorAll('.day[data-key]')];
    cards.forEach(card => card.classList.remove('v22-expanded'));

    const standardButton = document.getElementById('standardViewBtnV22');

    if(!desktopMode() || !expandedDayKey){
      standardButton?.classList.remove('active');
      return;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      expandedDayKey = null;
      standardButton?.classList.remove('active');
      return;
    }

    selected.classList.add('v22-expanded');
    standardButton?.classList.add('active');

    requestAnimationFrame(() => {
      selected.querySelectorAll('.hour-input').forEach(field => {
        if(typeof window.autoGrow === 'function') window.autoGrow(field,27);
      });
      selected.querySelectorAll('.todo-text').forEach(field => {
        if(typeof window.autoGrow === 'function') window.autoGrow(field,18);
      });
    });
  }

  function expandDay(card){
    if(!desktopMode() || !card?.dataset?.key) return;
    expandedDayKey = card.dataset.key;
    applyExpandedLayout();
    requestAnimationFrame(() => {
      card.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  // Maiuscola automatica PRIMA degli handler originali del Planner.
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

  // Clic sul titolo o sulla data del riquadro.
  document.addEventListener('click', event => {
    if(!desktopMode()) return;
    if(event.target.closest('input,textarea,button,select,a,label')) return;

    const header = event.target.closest('.day-head');
    if(!header) return;

    expandDay(header.closest('.day[data-key]'));
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
      applyExpandedLayout();
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