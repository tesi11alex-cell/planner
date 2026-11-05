/* =====================================================================
   PLANNER V47
   1. Ctrl+4 nelle Note e cose da organizzare: testo giallo.
      Il segno e' un carattere invisibile a inizio riga: le note restano
      testo normale, si sincronizzano e Ctrl+Z funziona come sempre.
   2. iPad: il campo in scrittura resta sopra la tastiera.
   ===================================================================== */
(() => {
  'use strict';

  const MARK = '⁣';
  const isLit = value => String(value || '').startsWith(MARK);

  function paintNotes(){
    document.querySelectorAll('.organizer-note-input').forEach(textarea => {
      textarea.closest('.organizer-note-row')
        ?.classList.toggle('v47-lit', isLit(textarea.value));
    });
  }

  function toggleHighlight(textarea){
    const index = Number(textarea.dataset.organizerNoteIndex);
    if(!Number.isInteger(index) || index < 0 || index >= organizerNotes.length) return;

    const value = textarea.value;
    const lit = isLit(value);
    if(!lit && !value.trim()) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const shift = lit ? -1 : 1;

    textarea.value = lit ? value.slice(1) : MARK + value;
    textarea.setSelectionRange(Math.max(0,start + shift), Math.max(0,end + shift));

    organizerNotes[index] = textarea.value;
    syncOrganizerTextareas(index, textarea.value, textarea);
    paintNotes();
    saveOrganizerNotesSetting();
  }

  document.addEventListener('keydown', event => {
    const isCtrl4 = event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey &&
      (event.code === 'Digit4' || event.code === 'Numpad4' || event.key === '4');
    if(!isCtrl4 || !event.target?.matches?.('.organizer-note-input')) return;

    event.preventDefault();
    event.stopPropagation();
    toggleHighlight(event.target);
  }, true);

  document.addEventListener('input', event => {
    if(event.target?.matches?.('.organizer-note-input')) paintNotes();
  });

  // Le righe vengono ricreate a ogni settimana e a ogni sincronizzazione.
  let paintFrame = null;
  new MutationObserver(() => {
    if(paintFrame) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      paintNotes();
    });
  }).observe(document.body,{childList:true,subtree:true});
  paintNotes();

  /* Aprendo o chiudendo la Vista grande gli altri giorni cambiano larghezza:
     ogni casella viene rimisurata, cosi nessun testo resta tagliato. */
  let growFrame = null;
  new MutationObserver(() => {
    cancelAnimationFrame(growFrame);
    growFrame = requestAnimationFrame(() => {
      document.querySelectorAll('.hour-input, .todo-text, .organizer-note-input').forEach(textarea => {
        if(textarea.offsetParent) autoGrow(textarea,14);
      });
    });
  }).observe(document.body,{attributes:true,attributeFilter:['class']});

  /* iPad: tastiera aperta */
  const bigTouch = window.matchMedia('(pointer:coarse) and (min-width:821px)');
  const viewport = window.visualViewport;

  function keepFieldVisible(){
    if(!bigTouch.matches) return;
    const field = document.activeElement;
    if(!field?.matches?.('textarea, input[type="text"]')) return;

    const rect = field.getBoundingClientRect();
    const top = viewport ? viewport.offsetTop : 0;
    const bottom = top + (viewport ? viewport.height : window.innerHeight);

    if(rect.bottom > bottom - 16 || rect.top < top + 16){
      field.scrollIntoView({block:'center',behavior:'smooth'});
    }
  }

  document.addEventListener('focusin', () => setTimeout(keepFieldVisible,350));
  document.addEventListener('input', keepFieldVisible);

  viewport?.addEventListener('resize', () => {
    if(!bigTouch.matches) return;
    const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    document.body.style.paddingBottom = keyboard > 120 ? `${keyboard}px` : '';
    if(keyboard > 120) setTimeout(keepFieldVisible,120);
  });
})();
