(() => {
  'use strict';

  let expandedKey = null;

  const desktop = () => window.matchMedia('(min-width:1101px)').matches;

  function capitalizeFirstLetter(value){
    const chars = Array.from(String(value ?? ''));
    const index = chars.findIndex(ch => /\p{L}/u.test(ch));
    if(index < 0) return chars.join('');
    chars[index] = chars[index].toLocaleUpperCase('it-IT');
    return chars.join('');
  }

  function markTextFields(root=document){
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

    fields.forEach(field => {
      field.setAttribute('autocapitalize','sentences');
    });
  }

  function prepareDayHeads(root=document){
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
    if(!sidebar || document.getElementById('standardViewBtnV20')) return;

    const btn = document.createElement('button');
    btn.id = 'standardViewBtnV20';
    btn.type = 'button';
    btn.className = 'standard-view-btn-v20';
    btn.textContent = '↺ Vista standard';
    btn.title = 'Riporta tutti i giorni alla dimensione normale';

    const firstCard = sidebar.querySelector('.side-card');
    sidebar.insertBefore(btn, firstCard || sidebar.firstChild);

    btn.addEventListener('click', () => {
      expandedKey = null;
      applyExpanded();
      document.getElementById('weekGrid')?.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    });
  }

  function applyExpanded(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return;

    const cards = [...grid.querySelectorAll('.day[data-key]')];
    cards.forEach(card => card.classList.remove('v20-expanded'));

    const button = document.getElementById('standardViewBtnV20');

    if(!desktop() || !expandedKey){
      button?.classList.remove('active');
      return;
    }

    const card = cards.find(item => item.dataset.key === expandedKey);
    if(!card){
      expandedKey = null;
      button?.classList.remove('active');
      return;
    }

    card.classList.add('v20-expanded');
    button?.classList.add('active');

    requestAnimationFrame(() => {
      card.querySelectorAll('.hour-input').forEach(el => {
        if(typeof window.autoGrow === 'function') window.autoGrow(el,27);
      });
      card.querySelectorAll('.todo-text').forEach(el => {
        if(typeof window.autoGrow === 'function') window.autoGrow(el,18);
      });
    });
  }

  function expandCard(card){
    if(!desktop() || !card?.dataset?.key) return;
    expandedKey = card.dataset.key;
    applyExpanded();

    requestAnimationFrame(() => {
      card.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }

  /* Prima lettera maiuscola.
     Capture=true: il Planner salva già il valore corretto su Firebase. */
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
      if(start !== null && end !== null) target.setSelectionRange(start,end);
    }catch(error){}
  }, true);

  /* Cliccando sul titolo/data del giorno lo espande. */
  document.addEventListener('click', event => {
    if(!desktop()) return;
    if(event.target.closest('input,textarea,button,select,a,label')) return;

    const head = event.target.closest('.day-head');
    if(!head) return;

    expandCard(head.closest('.day[data-key]'));
  });

  document.addEventListener('keydown', event => {
    if(!desktop()) return;
    if(event.key !== 'Enter' && event.key !== ' ') return;

    const head = event.target.closest?.('.day-head');
    if(!head) return;

    event.preventDefault();
    expandCard(head.closest('.day[data-key]'));
  });

  function initialize(){
    ensureStandardButton();
    markTextFields(document);
    prepareDayHeads(document);
    applyExpanded();

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node => {
          if(node.nodeType !== 1) return;
          markTextFields(node);
          prepareDayHeads(node);
        });
      }
      ensureStandardButton();
      applyExpanded();
    });

    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',applyExpanded);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();