/* =====================================================================
   PLANNER V48
   1. Clic su un giorno del calendario (o dentro un giorno): il giorno si
      illumina di giallo tenue. Il giorno di oggi resta com'e.
   2. Testo lungo: oltre due righe sfuma, toccandolo si legge tutto.
   3. Due schermate affiancate (finestra stretta e alta): solo il giorno
      attuale, come sul telefono.
   ===================================================================== */
(() => {
  'use strict';

  const pad = n => String(n).padStart(2,'0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayKey = () => keyOf(new Date());
  const selectedKey = () =>
    (typeof currentDate !== 'undefined' && currentDate instanceof Date) ? keyOf(currentDate) : null;

  const solo = window.matchMedia(
    '(pointer:fine) and (min-width:1101px) and (max-aspect-ratio:6/5), (pointer:fine) and (min-width:821px) and (max-width:1100px)'
  );

  let focusKey = null;
  let soloKey = null;
  let lastCalendarClick = 0;
  let frame = null;

  const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const cards = () => [...document.querySelectorAll('#weekGrid .day[data-key]')];

  function markClamped(){
    document.querySelectorAll('.hour-input, .todo-text, .organizer-note-input').forEach(field => {
      if(!field.offsetParent) return;
      field.classList.toggle('v48-more', field.scrollHeight > field.clientHeight + 3);
    });
  }

  /* Orari: il carattere resta sempre lo stesso. Se un impegno ha bisogno di piu righe, le fasce
     vuote vicine (prima o dopo) spariscono per fargli spazio, cosi l'agenda non si allunga.
     Nulla viene cancellato: le fasce vuote si rivedono in Vista grande. */
  const desktop = window.matchMedia('(min-width:1101px)');
  let lastRowH = 250;
  const filled = row => !!(row.querySelector('.hour-input')?.value.trim() || row.querySelector('[data-hour-check]:checked'));
  function compactHours(){
    if(!desktop.matches) return;
    const app = document.querySelector('.app');
    const zoom = parseFloat(getComputedStyle(app).zoom) || 1;
    cards().forEach(card => {
      const rows = [...card.querySelectorAll('.hour-row[data-base-hour]')];
      rows.forEach(r => { if(r.dataset.v48hid){ r.style.removeProperty('display'); delete r.dataset.v48hid; } });
      if(card.classList.contains('v42-expanded')) return;
      const BOUNDARY = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
      // righe che il tuo Planner mostra in vista standard: ore pari + righe con testo
      const shown = rows.filter(r => BOUNDARY.includes(r.dataset.baseHour) || filled(r) || r.contains(document.activeElement));
      rows.forEach(r => { if(!shown.includes(r)){ r.style.display = 'none'; r.dataset.v48hid = '1'; } });

      const head = card.querySelector('.day-head');
      const cs = getComputedStyle(card);
      const avail = lastRowH - ((head ? head.getBoundingClientRect().height / zoom : 28) +
        parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 12);
      const height = r => r.getBoundingClientRect().height / zoom;
      let total = shown.reduce((s,r) => s + height(r), 0);
      if(total <= avail) return;

      const idx = new Map(shown.map((r,i) => [r,i]));
      const full = shown.map(filled);
      const dist = r => {
        let d = 99;
        shown.forEach((x,i) => { if(full[i]) d = Math.min(d, Math.abs(i - idx.get(r))); });
        return d;
      };
      const removable = shown.filter(r => !filled(r) && !r.contains(document.activeElement))
        .sort((x,y) => dist(x) - dist(y) || idx.get(y) - idx.get(x));
      for(const r of removable){
        if(total <= avail) break;
        total -= height(r);
        r.style.display = 'none'; r.dataset.v48hid = '1';
      }
    });
  }

  /* Vista grande: l'ora corrente illuminata resta sempre visibile (anche quando scatta una nuova ora). */
  let lastHour = new Date().getHours();
  function revealNow(){
    const card = document.querySelector('.day.v42-expanded');
    const row = card?.querySelector('.hour-row.now');
    if(!card || !row) return;
    if(card.scrollHeight > card.clientHeight + 2){
      const c = card.getBoundingClientRect(), r = row.getBoundingClientRect();
      if(r.top < c.top + 50 || r.bottom > c.bottom - 10){
        card.scrollTop += (r.top - c.top) - card.clientHeight / 2 + r.height / 2;
      }
    }
    const r2 = row.getBoundingClientRect();
    if(r2.bottom > window.innerHeight - 12 || r2.top < 12){
      row.scrollIntoView({block:'center', behavior:'smooth'});
    }
  }
  function moveNow(){
    const h = new Date().getHours();
    if(h === lastHour) return;
    lastHour = h;
    const today = document.querySelector(`.day[data-key="${todayKey()}"]`);
    if(!today) return;
    today.querySelectorAll('.hour-row.now').forEach(r => r.classList.remove('now'));
    const base = String(h).padStart(2,'0') + ':00';
    today.querySelectorAll(`.hour-row[data-base-hour="${base}"]:not([data-extra-id])`).forEach(r => r.classList.add('now'));
    revealNow();
  }
  setInterval(moveNow, 20000);
  let wasOpen = null;
  function watchOpen(){
    const open = document.querySelector('.day.v42-expanded')?.dataset.key || null;
    if(open && open !== wasOpen) setTimeout(revealNow, 450);
    wasOpen = open;
  }

  /* Pagina bloccata: se qualcosa la sposta (es. il clic sul calendario), torna subito in alto,
     cosi la riga del mese non resta mai coperta. */
  function locked(){
    return desktop.matches && !solo.matches &&
      !document.body.classList.contains('v42-expanded-active') &&
      !document.body.classList.contains('v42-notes-expanded-active');
  }
  window.addEventListener('scroll', () => {
    if(locked() && (window.scrollY > 0 || document.documentElement.scrollTop > 0)) window.scrollTo(0,0);
  }, {passive:true});

  /* Frecce in alto: "‹ Sett" e "Sett ›". */
  function labelArrows(){
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    if(prev && !prev.querySelector('.v48-lbl')) prev.innerHTML = '‹<span class="v48-lbl"> Sett</span>';
    if(next && !next.querySelector('.v48-lbl')) next.innerHTML = '<span class="v48-lbl">Sett </span>›';
  }

  /* Altezza delle righe di giorni: la settimana intera sta nella pagina, senza scorrere. */
  function fitRows(){
    const grid = document.getElementById('weekGrid');
    const app = document.querySelector('.app');
    if(!grid || !app) return;
    const zoom = parseFloat(getComputedStyle(app).zoom) || 1;
    const top = grid.getBoundingClientRect().top + window.scrollY;
    const avail = Math.floor((window.innerHeight - top - 14 * zoom) / zoom);
    document.documentElement.style.setProperty('--v48-avail', avail + 'px');

    const list = cards();
    const rows = Math.max(1, new Set([...list, document.querySelector('.week-notes')].filter(Boolean)
      .map(c => Math.round(c.getBoundingClientRect().top / zoom / 4))).size);
    const rowH = Math.max(Math.floor((avail - 11 * (rows - 1)) / rows), 150);
    document.documentElement.style.setProperty('--v48-row-h', rowH + 'px');

    lastRowH = rowH;
  }

  /* "Invia a una data": un + che apre una finestra sopra la pagina, non una tendina. */
  let quickModal = null;
  function toast(message){
    let el = document.querySelector('.v48-toast');
    if(!el){ el = document.createElement('div'); el.className = 'v48-toast'; document.body.appendChild(el); }
    el.textContent = message; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function closeQuick(){
    if(!quickModal) return;
    const form = document.querySelector('.v45-quick-form');
    const card = document.querySelector('.v45-quick-card');
    if(form && card){ form.hidden = true; card.appendChild(form); }
    quickModal.remove(); quickModal = null;
    document.removeEventListener('keydown', escQuick, true);
  }
  function escQuick(e){ if(e.key === 'Escape') closeQuick(); }
  function openQuick(){
    const form = document.querySelector('.v45-quick-form') || document.querySelector('#quickTaskText')?.closest('.quick-task-form');
    if(!form || quickModal) return;
    quickModal = document.createElement('div');
    quickModal.className = 'v48-modal';
    quickModal.innerHTML = '<div class="v48-modal-box" role="dialog" aria-label="Invia a una data">' +
      '<div class="v48-modal-head"><strong>Invia a una data</strong><button type="button" class="v48-modal-x" aria-label="Chiudi">×</button></div>' +
      '<div class="v48-modal-body"></div></div>';
    document.body.appendChild(quickModal);
    form.hidden = false;
    quickModal.querySelector('.v48-modal-body').appendChild(form);
    quickModal.addEventListener('mousedown', e => { if(e.target === quickModal) closeQuick(); });
    quickModal.querySelector('.v48-modal-x').addEventListener('click', closeQuick);
    document.addEventListener('keydown', escQuick, true);
    setTimeout(() => document.getElementById('quickTaskText')?.focus(), 30);
  }
  function setupQuick(){
    const toggle = document.querySelector('.v45-quick-toggle');
    if(!toggle || toggle.dataset.v48) return;
    toggle.dataset.v48 = '1';
    const chev = toggle.querySelector('.v45-chevron');
    if(chev){ chev.textContent = '+'; chev.classList.add('v48-plus'); }
    toggle.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); openQuick(); }, true);
    document.getElementById('quickTaskBtn')?.addEventListener('click', () => {
      const had = document.getElementById('quickTaskText')?.value.trim();
      const date = document.getElementById('quickTaskDate')?.value || '';
      if(!had) return;
      let tries = 0;
      const wait = setInterval(() => {
        tries++;
        if(!document.getElementById('quickTaskText')?.value.trim()){
          clearInterval(wait);
          closeQuick();
          const [y,m,d] = date.split('-');
          toast(`Aggiunto a Cose da fare del ${d}/${m}/${y}`);
        }else if(tries > 30){ clearInterval(wait); }
      }, 150);
    }, true);
  }

  function apply(){
    const tk = todayKey();
    const list = cards();

    list.forEach(card => {
      card.classList.toggle('v48-focus', card.dataset.key === focusKey && card.dataset.key !== tk);
      card.classList.remove('v48-solo-day');
    });

    document.body.classList.toggle('v48-solo-on', solo.matches);
    if(solo.matches){
      const target =
        list.find(c => c.dataset.key === soloKey) ||
        list.find(c => c.dataset.key === tk) ||
        list.find(c => c.dataset.key === selectedKey()) ||
        list[0];
      target?.classList.add('v48-solo-day');
    }

    compactHours();
    watchOpen();
    labelArrows();
    setupQuick();
    fitRows();
    markClamped();
  }

  function schedule(){
    if(frame) return;
    frame = requestAnimationFrame(() => { frame = null; apply(); });
  }

  document.addEventListener('click', event => {
    const calendarDay = event.target.closest?.('[data-v43-date]');
    if(calendarDay){
      focusKey = calendarDay.dataset.v43Date;
      soloKey = focusKey;
      lastCalendarClick = Date.now();
      // La settimana viene ridisegnata in modo asincrono: riprova per un attimo.
      [0,60,160,350,700,1200,2000].forEach(ms => setTimeout(apply,ms));
      return;
    }

    const card = event.target.closest?.('.day[data-key]');
    if(card){
      // Oggi resta com'e; ogni altro giorno cliccato si illumina.
      focusKey = card.dataset.key === todayKey() ? null : card.dataset.key;
      apply();
    }
  }, true);

  document.addEventListener('focusout', () => setTimeout(markClamped,0), true);
  document.addEventListener('input', event => {
    if(event.target?.matches?.('.hour-input, .todo-text, .organizer-note-input')) schedule();
  });

  solo.addEventListener?.('change', schedule);
  window.addEventListener('resize', schedule);

  function init(){
    const grid = document.getElementById('weekGrid');
    if(grid){
      new MutationObserver(schedule).observe(grid,{childList:true,subtree:true});
    }
    // Vista grande / Vista standard cambiano solo le classi: riapplica gli orari compatti.
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
    // Cambio settimana con le frecce o con OGGI: torna al giorno attuale.
    const range = document.getElementById('weekRange');
    if(range){
      new MutationObserver(() => {
        if(Date.now() - lastCalendarClick > 2500){ soloKey = null; focusKey = null; }
        schedule();
      }).observe(range,{childList:true,characterData:true,subtree:true});
    }
    schedule();
    setTimeout(apply,400);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();
