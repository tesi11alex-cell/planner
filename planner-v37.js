(() => {
  'use strict';

  let expandedDayKey = null;
  let pendingCalendarDayKey = null;
  let expandedPanel = null; // null | 'day' | 'notes'

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
      textarea.classList.contains('hour-input') ? 14 :
      textarea.classList.contains('todo-text') ? 15 :
      textarea.classList.contains('organizer-note-input') ? 17 :
      15;

    textarea.style.height = '0px';
    textarea.style.height = Math.max(textarea.scrollHeight,minHeight) + 'px';
  }

  function resizeAllTextareas(root=document){
    if(root?.matches?.('.hour-input, .todo-text, .organizer-note-input')){
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

    fields.forEach(field => {
      field.setAttribute('autocapitalize','sentences');
    });

    resizeAllTextareas(root);
  }

  function rowHasContent(row){
    if(!row) return false;
    const text = String(row.querySelector('.hour-input')?.value || '').trim();
    const checked = Boolean(row.querySelector('[data-hour-check]')?.checked);
    return Boolean(text || checked);
  }

  /*
    VISTA STANDARD:
    - mostra sempre 08:00
    - mostra sempre 22:00
    - mostra tutte le righe dove c'è scritto qualcosa
    - mostra una riga flaggata anche se non ha testo, per non nascondere dati
    - nasconde gli altri orari vuoti
  */
  function applyCompactHoursToCard(card){
    if(!card) return;

    const expanded =
      desktopMode() &&
      expandedDayKey &&
      card.dataset.key === expandedDayKey;

    card.querySelectorAll('.hour-row[data-base-hour]').forEach(row => {
      if(expanded || !desktopMode()){
        row.style.removeProperty('display');
        return;
      }

      const baseHour = row.dataset.baseHour;
      const keepBoundary = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'].includes(baseHour);
      const keepContent = rowHasContent(row);

      row.style.display = (keepBoundary || keepContent) ? '' : 'none';
    });
  }

  function applyCompactHours(){
    document.querySelectorAll('.day[data-key]').forEach(applyCompactHoursToCard);
  }

  
  
  function forceCompactNotes(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return;

    notes.classList.remove('v37-notes-expanded');
    document.body.classList.remove('v37-notes-expanded-active');

    notes.style.removeProperty('grid-column');
    notes.style.removeProperty('width');
    notes.style.removeProperty('max-width');
    notes.style.removeProperty('min-width');
    notes.style.removeProperty('min-height');

    requestAnimationFrame(updateCompactNotesSpan);
  }

  function forceCompactDays(){
    const grid = document.getElementById('weekGrid');
    if(!grid) return;

    grid.querySelectorAll('.day[data-key]').forEach(card => {
      clearExpansion(card);
    });

    document.body.classList.remove('v37-expanded-active');
  }

function setStandardView(options={}){
    const {scrollTarget=null} = options;

    expandedDayKey = null;
    pendingCalendarDayKey = null;
    expandedPanel = null;

    forceCompactDays();
    forceCompactNotes();

    applyExpandedLayout();
    applyNotesLayout();
    updateCompactNotesSpan();
    applyCompactHours();
    resizeAllTextareas(document);

    if(scrollTarget){
      scrollTarget.scrollIntoView({
        behavior:'smooth',
        block:'nearest'
      });
    }
  }

function ensureStandardButton(){
    /* V37: il pulsante non viene più mostrato nella sidebar. */
  }

  
  function ensureLargeDayButton(card){
    if(!card) return;
    const head = card.querySelector('.day-head');
    if(!head || head.querySelector('.v37-large-day')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v37-large-day';
    button.textContent = '⛶ Vista grande';
    button.title = 'Apri questo giorno in vista grande';
    head.appendChild(button);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if(!desktopMode()) return;
      expandDay(card);
    });
  }

  function ensureLargeDayButtons(root=document){
    root.querySelectorAll?.('.day[data-key]').forEach(ensureLargeDayButton);
  }

function ensureInsideStandardButton(card){
    if(!card) return;

    let row = card.querySelector('.v37-standard-row');
    if(row) return;

    const head = card.querySelector('.day-head');
    if(!head) return;

    row = document.createElement('div');
    row.className = 'v37-standard-row';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v37-standard-inside';
    button.textContent = '↺ Vista standard';
    button.title = 'Torna alla vista standard';

    row.appendChild(button);
    head.appendChild(row);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      setStandardView({scrollTarget:card});
    });
  }

  function ensureNotesActions(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return;

    const head = notes.querySelector('.week-notes-head');
    const addButton = notes.querySelector('.organizer-add-row');
    if(!head || !addButton) return;
    if(head.querySelector('.v37-notes-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'v37-notes-actions';

    const largeButton = document.createElement('button');
    largeButton.type = 'button';
    largeButton.className = 'v37-notes-large';
    largeButton.textContent = '⛶ Vista grande';
    largeButton.title = 'Apri le Note in vista grande';

    const standardButton = document.createElement('button');
    standardButton.type = 'button';
    standardButton.className = 'v37-notes-standard';
    standardButton.textContent = '↺ Vista standard';
    standardButton.title = 'Torna alla vista standard';

    actions.appendChild(largeButton);
    actions.appendChild(addButton);
    actions.appendChild(standardButton);
    head.appendChild(actions);

    largeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if(!desktopMode()) return;
      expandNotes();
    });

    standardButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      setStandardView({scrollTarget:notes});
    });
  }

  function updateCompactNotesSpan(){
    const notes = document.querySelector('.week-notes');
    const grid = document.getElementById('weekGrid');
    if(!notes || !grid) return;

    notes.classList.remove('v37-notes-one-col');

    /* Se le Note sono grandi o non siamo su desktop, nessun calcolo compatto. */
    if(!desktopMode() || expandedPanel === 'notes'){
      return;
    }

    /*
      Simuliamo la griglia a 3 colonne usando l'ordine reale dei giorni.
      Ogni giorno piccolo occupa 1 colonna.
      Il giorno aperto occupa 3 colonne e, se necessario, va a capo.
      Se alla fine restano esattamente 2 colonne già occupate
      (es. Sabato + Domenica), alle Note resta 1 sola colonna:
      in quel caso diventano automaticamente da 1 spazio.
      Altrimenti restano da 2 spazi.
    */
    const cards = [...grid.querySelectorAll('.day[data-key]')];
    let col = 0; // colonne già occupate nell'ultima riga: 0..2

    for(const card of cards){
      const isExpanded =
        expandedPanel === 'day' &&
        expandedDayKey &&
        card.dataset.key === expandedDayKey;

      const span = isExpanded ? 3 : 1;

      if(span === 3){
        if(col !== 0){
          col = 0; // il giorno grande parte dalla riga successiva
        }
        col = 0;   // occupa tutta la riga e quella successiva riparte da zero
        continue;
      }

      col += 1;
      if(col >= 3){
        col = 0;
      }
    }

    if(col === 2){
      notes.classList.add('v37-notes-one-col');
    }
  }

function applyNotesLayout(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return false;

    /*
      Se non sono le Note il pannello attivo, devono essere
      SEMPRE nella loro forma compatta da una colonna.
    */
    if(!desktopMode() || expandedPanel !== 'notes'){
      forceCompactNotes();
      updateCompactNotesSpan();
      return false;
    }

    /*
      Aprire le Note chiude obbligatoriamente qualsiasi giorno.
    */
    forceCompactDays();

    document.body.classList.add('v37-notes-expanded-active');
    document.body.classList.remove('v37-expanded-active');
    notes.classList.remove('v37-notes-one-col');
    notes.classList.add('v37-notes-expanded');

    resizeAllTextareas(notes);
    return true;
  }

  function focusExpandedNotes(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return;

    const move = () => {
      const rect = notes.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;

      const target = rect.height >= window.innerHeight - 80
        ? absoluteTop - 18
        : absoluteTop - ((window.innerHeight - rect.height) / 2);

      window.scrollTo({
        top:Math.max(0,target),
        behavior:'smooth'
      });
    };

    requestAnimationFrame(move);
    setTimeout(move,120);
    setTimeout(move,280);
  }

  function expandNotes(){
    if(!desktopMode()) return;

    forceCompactDays();

    expandedPanel = 'notes';
    expandedDayKey = null;
    pendingCalendarDayKey = null;

    applyNotesLayout();
    applyCompactHours();
    focusExpandedNotes();
  }

  function clearExpansion(card){
    card.classList.remove('v37-expanded');

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

    const button = null;

    if(!desktopMode() || expandedPanel !== 'day' || !expandedDayKey){
      document.body.classList.remove('v37-expanded-active');
      
      applyCompactHours();
      resizeAllTextareas(document);
      return false;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      expandedDayKey = null;
      document.body.classList.remove('v37-expanded-active');
      
      applyCompactHours();
      return false;
    }

    document.body.classList.add('v37-expanded-active');
    selected.classList.add('v37-expanded');
    ensureInsideStandardButton(selected);

    /* Backup inline per evitare problemi dovuti a vecchie cache CSS. */
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

    

    applyCompactHours();
    resizeAllTextareas(selected);
    return true;
  }

  /*
    Porta il giorno selezionato direttamente in primo piano.
    Se il riquadro è più alto della finestra, allinea il suo inizio;
    altrimenti ne centra il contenuto nello schermo.
  */
  function focusExpandedCard(card){
    if(!card) return;

    const move = () => {
      const rect = card.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;

      let target;
      if(rect.height >= window.innerHeight - 80){
        target = absoluteTop - 18;
      }else{
        target =
          absoluteTop -
          ((window.innerHeight - rect.height) / 2);
      }

      window.scrollTo({
        top:Math.max(0,target),
        behavior:'smooth'
      });
    };

    requestAnimationFrame(move);
    setTimeout(move,120);
    setTimeout(move,280);
  }

  function expandDay(card){
    if(!desktopMode() || !card?.dataset?.key) return;

    forceCompactNotes();
    forceCompactDays();

    expandedPanel = 'day';
    expandedDayKey = card.dataset.key;
    pendingCalendarDayKey = null;

    applyExpandedLayout();
    updateCompactNotesSpan();
    applyCompactHours();
    resizeAllTextareas(card);
    focusExpandedCard(card);
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

    forceCompactNotes();
    forceCompactDays();

    expandedPanel = 'day';
    expandedDayKey = pendingCalendarDayKey;
    pendingCalendarDayKey = null;

    applyExpandedLayout();
    updateCompactNotesSpan();
    applyCompactHours();
    resizeAllTextareas(card);
    focusExpandedCard(card);
  }

  async function deleteEmptyTodo(textarea){
    if(!textarea || String(textarea.value || '').trim()) return;

    const item = textarea.closest('.todo-item[data-task-id]');
    const card = textarea.closest('.day[data-key]');
    if(!item || !card) return;

    const taskId = String(item.dataset.taskId || '');
    const key = card.dataset.key;
    if(!taskId || !key) return;

    try{
      if(
        typeof dateFromKey !== 'function' ||
        typeof loadDay !== 'function' ||
        typeof saveDay !== 'function'
      ) return;

      const d = dateFromKey(key);
      if(!d) return;

      const val = await loadDay(d);
      val.tasks = Array.isArray(val.tasks)
        ? val.tasks.filter(task => String(task.id) !== taskId)
        : [];

      const list = card.querySelector(`[data-list="${key}"]`);

      if(list && typeof renderTodos === 'function'){
        renderTodos(list,val);
      }else{
        item.remove();
      }

      await saveDay(d);

      if(typeof renderUpcomingPanels === 'function'){
        await renderUpcomingPanels();
      }

      resizeAllTextareas(card);
      applyCompactHoursToCard(card);

    }catch(error){
      console.warn('Eliminazione automatica Cosa da fare vuota non riuscita',error);
    }
  }

  /* Maiuscola automatica + righe che crescono per mostrare tutto il testo. */
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

      if(target.matches('.organizer-note-input')){
        requestAnimationFrame(() => resizeTextarea(target));
      }
    }

    if(target?.matches?.('.hour-input') && !expandedDayKey){
      applyCompactHoursToCard(target.closest('.day[data-key]'));
    }
  }, true);

  /*
    Se cancelli tutto il testo di una Cosa da fare e poi esci dalla casella,
    la voce viene eliminata realmente dai dati e da Firebase.
  */
  document.addEventListener('focusout', event => {
    const textarea = event.target?.closest?.('.todo-text');
    if(!textarea) return;

    setTimeout(() => {
      deleteEmptyTodo(textarea);
    },0);
  }, true);

  /*
    Click su qualsiasi zona del giorno:
    titolo, ore, Cose da fare, testo, checkbox e pulsanti.
  */
  document.addEventListener('click', event => {
    if(!desktopMode()) return;

    const calendarButton = event.target.closest('[data-calendar-day]');
    if(calendarButton){
      const dayNumber = Number(calendarButton.dataset.calendarDay);
      const key = selectedCalendarKey(dayNumber);

      if(key){
        forceCompactNotes();
        pendingCalendarDayKey = key;
        expandedDayKey = key;
        expandedPanel = 'day';

        setTimeout(tryApplyPendingCalendarDay,0);
        setTimeout(tryApplyPendingCalendarDay,60);
        setTimeout(tryApplyPendingCalendarDay,180);
        setTimeout(tryApplyPendingCalendarDay,400);
        setTimeout(tryApplyPendingCalendarDay,800);
      }
      return;
    }

    const notes = event.target.closest('.week-notes');
    if(notes){
      expandNotes();
      return;
    }

    const card = event.target.closest('.day[data-key]');
    if(!card) return;

    expandDay(card);
  });

  function initialize(){
    /* Rimuoviamo l'eventuale zoom lasciato da V25. */
    document.querySelector('.planner-layout')?.style.removeProperty('zoom');

    ensureStandardButton();
    ensureNotesActions();
    ensureLargeDayButtons(document);
    prepareFields(document);
    applyExpandedLayout();
    applyNotesLayout();
    updateCompactNotesSpan();
    applyCompactHours();

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
      ensureNotesActions();
      ensureLargeDayButtons(document);

      if(pendingCalendarDayKey){
        tryApplyPendingCalendarDay();
      }else if(expandedPanel === 'notes'){
        forceCompactDays();
        applyNotesLayout();
      }else if(expandedPanel === 'day' && expandedDayKey){
        forceCompactNotes();
        applyExpandedLayout();
      }else{
        forceCompactDays();
        forceCompactNotes();

        if(changed){
          applyCompactHours();
          resizeAllTextareas(document);
        }

        updateCompactNotesSpan();
      }
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true
    });

    window.addEventListener('resize',() => {
      document.querySelector('.planner-layout')?.style.removeProperty('zoom');

      if(expandedPanel === 'notes'){
        forceCompactDays();
        applyNotesLayout();
        focusExpandedNotes();
      }else if(expandedPanel === 'day' && expandedDayKey){
        forceCompactNotes();
        applyExpandedLayout();

        const card = document.querySelector(
          `.day[data-key="${expandedDayKey}"]`
        );
        focusExpandedCard(card);
      }else{
        forceCompactDays();
        forceCompactNotes();
        applyCompactHours();
        resizeAllTextareas(document);
      }

      updateCompactNotesSpan();
    });

    setTimeout(() => {
      document.querySelector('.planner-layout')?.style.removeProperty('zoom');
      applyCompactHours();
      resizeAllTextareas(document);
    },250);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',initialize,{once:true});
  }else{
    initialize();
  }
})();