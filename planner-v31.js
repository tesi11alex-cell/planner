(() => {
  'use strict';

  let expandedDayKey = null;
  let pendingCalendarDayKey = null;
  let notesExpanded = false;

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

  function ensureStandardButton(){
    /* V31: il pulsante non viene più mostrato nella sidebar. */
  }

  function ensureInsideStandardButton(card){
    if(!card) return;

    let row = card.querySelector('.v31-standard-row');
    if(row) return;

    const head = card.querySelector('.day-head');
    if(!head) return;

    row = document.createElement('div');
    row.className = 'v31-standard-row';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v31-standard-inside';
    button.textContent = '↺ Vista standard';
    button.title = 'Torna alla vista standard';

    row.appendChild(button);

    /* V31: il pulsante entra DENTRO l'intestazione del giorno,
       quindi resta sulla stessa riga, all'estrema destra. */
    head.appendChild(row);

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      expandedDayKey = null;
      pendingCalendarDayKey = null;
      document.body.classList.remove('v31-expanded-active');

      applyExpandedLayout();
      applyCompactHours();
      resizeAllTextareas(document);

      card.scrollIntoView({
        behavior:'smooth',
        block:'nearest'
      });
    });
  }

  
  function ensureNotesActions(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return;

    const head = notes.querySelector('.week-notes-head');
    const addButton = notes.querySelector('.organizer-add-row');
    if(!head || !addButton) return;
    if(head.querySelector('.v31-notes-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'v31-notes-actions';

    const standardButton = document.createElement('button');
    standardButton.type = 'button';
    standardButton.className = 'v31-notes-standard';
    standardButton.textContent = '↺ Vista standard';
    standardButton.title = 'Torna alla vista standard';

    actions.appendChild(standardButton);
    actions.appendChild(addButton);
    head.appendChild(actions);

    standardButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      notesExpanded = false;
      expandedDayKey = null;
      pendingCalendarDayKey = null;

      document.body.classList.remove('v31-expanded-active');
      document.body.classList.remove('v31-notes-expanded-active');

      applyExpandedLayout();
      applyNotesLayout();
      applyCompactHours();
      resizeAllTextareas(document);

      notes.scrollIntoView({
        behavior:'smooth',
        block:'nearest'
      });
    });
  }

  function applyNotesLayout(){
    const notes = document.querySelector('.week-notes');
    if(!notes) return false;

    notes.classList.remove('v31-notes-expanded');

    if(!desktopMode() || !notesExpanded){
      document.body.classList.remove('v31-notes-expanded-active');
      return false;
    }

    document.body.classList.add('v31-notes-expanded-active');
    document.body.classList.remove('v31-expanded-active');
    notes.classList.add('v31-notes-expanded');

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

    notesExpanded = true;
    expandedDayKey = null;
    pendingCalendarDayKey = null;

    applyExpandedLayout();
    applyNotesLayout();
    focusExpandedNotes();
  }

function clearExpansion(card){
    card.classList.remove('v31-expanded');

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

    if(!desktopMode() || !expandedDayKey){
      document.body.classList.remove('v31-expanded-active');
      
      applyCompactHours();
      resizeAllTextareas(document);
      return false;
    }

    const selected = cards.find(card => card.dataset.key === expandedDayKey);
    if(!selected){
      expandedDayKey = null;
      document.body.classList.remove('v31-expanded-active');
      
      applyCompactHours();
      return false;
    }

    document.body.classList.add('v31-expanded-active');
    selected.classList.add('v31-expanded');
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

    expandedDayKey = card.dataset.key;
    pendingCalendarDayKey = null;
    notesExpanded = false;
    document.body.classList.remove('v31-notes-expanded-active');

    applyExpandedLayout();
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

    expandedDayKey = pendingCalendarDayKey;
    pendingCalendarDayKey = null;

    applyExpandedLayout();
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
    prepareFields(document);
    applyExpandedLayout();
    applyNotesLayout();
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

      if(pendingCalendarDayKey){
        tryApplyPendingCalendarDay();
      }else if(expandedDayKey){
        applyExpandedLayout();
      }else if(changed){
        applyCompactHours();
        resizeAllTextareas(document);
      }
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true
    });

    window.addEventListener('resize',() => {
      document.querySelector('.planner-layout')?.style.removeProperty('zoom');

      if(notesExpanded){
        applyNotesLayout();
        focusExpandedNotes();
      }else if(expandedDayKey){
        applyExpandedLayout();
        const card = document.querySelector(
          `.day[data-key="${expandedDayKey}"]`
        );
        focusExpandedCard(card);
      }else{
        applyCompactHours();
        resizeAllTextareas(document);
      }
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