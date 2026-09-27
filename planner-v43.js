(() => {
  'use strict';

  const MONTHS = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
  ];
  const WEEKDAYS = ['L','M','M','G','V','S','D'];

  let viewYear;
  let viewMonth;

  function mondayIndex(date){
    return (date.getDay() + 6) % 7;
  }

  function sameDate(a,b){
    return a &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function ensureSidebarCalendar(){
    const sidebar = document.querySelector('.desktop-sidebar');
    if(!sidebar) return null;

    let card = document.getElementById('v43SidebarCalendar');
    if(card) return card;

    card = document.createElement('section');
    card.className = 'side-card v43-calendar-card';
    card.id = 'v43SidebarCalendar';
    card.innerHTML = `
      <div class="v43-calendar-head">
        <button type="button" class="v43-month-arrow" id="v43PrevMonth"
          aria-label="Mese precedente" title="Mese precedente">‹</button>
        <button type="button" class="v43-month-title" id="v43MonthTitle"
          title="Apri la scelta del mese"></button>
        <button type="button" class="v43-month-arrow" id="v43NextMonth"
          aria-label="Mese successivo" title="Mese successivo">›</button>
      </div>
      <div class="v43-weekdays" aria-hidden="true"></div>
      <div class="v43-days" id="v43CalendarDays"></div>
    `;

    sidebar.insertBefore(card, sidebar.firstElementChild);

    card.querySelector('.v43-weekdays').innerHTML =
      WEEKDAYS.map(d => `<span>${d}</span>`).join('');

    card.querySelector('#v43PrevMonth').addEventListener('click', () => changeMonth(-1));
    card.querySelector('#v43NextMonth').addEventListener('click', () => changeMonth(1));

    // Mantiene disponibile la tendina mese già esistente nel Planner.
    card.querySelector('#v43MonthTitle').addEventListener('click', () => {
      const select = document.getElementById('monthSelect');
      if(!select) return;
      select.focus();
      try { select.showPicker?.(); } catch(e) {}
      select.click();
    });

    card.querySelector('#v43CalendarDays').addEventListener('click', async event => {
      const button = event.target.closest('[data-v43-date]');
      if(!button) return;

      const [y,m,d] = button.dataset.v43Date.split('-').map(Number);
      if(typeof currentDate === 'undefined' || typeof render !== 'function') return;

      currentDate = new Date(y, m - 1, d);

      const monthSelect = document.getElementById('monthSelect');
      if(monthSelect) monthSelect.value = `${y}-${m-1}`;

      await render();
      viewYear = y;
      viewMonth = m - 1;
      renderSidebarCalendar();

      const grid = document.getElementById('weekGrid');
      grid?.scrollIntoView({behavior:'smooth', block:'start'});
    });

    return card;
  }

  function changeMonth(delta){
    const d = new Date(viewYear, viewMonth + delta, 1);
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
    renderSidebarCalendar();
  }

  function renderSidebarCalendar(){
    const card = ensureSidebarCalendar();
    if(!card) return;

    if(viewYear == null || viewMonth == null){
      const base = (typeof currentDate !== 'undefined' && currentDate instanceof Date)
        ? currentDate : new Date();
      viewYear = base.getFullYear();
      viewMonth = base.getMonth();
    }

    const title = card.querySelector('#v43MonthTitle');
    const days = card.querySelector('#v43CalendarDays');
    title.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

    const first = new Date(viewYear, viewMonth, 1);
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();
    const selected = (typeof currentDate !== 'undefined' && currentDate instanceof Date)
      ? currentDate : null;

    let html = '';
    for(let i=0; i<mondayIndex(first); i++){
      html += '<span class="v43-empty" aria-hidden="true"></span>';
    }

    for(let day=1; day<=count; day++){
      const date = new Date(viewYear, viewMonth, day);
      const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const cls = [
        'v43-day',
        sameDate(date,today) ? 'today' : '',
        sameDate(date,selected) ? 'selected' : ''
      ].filter(Boolean).join(' ');

      html += `<button type="button" class="${cls}" data-v43-date="${iso}"
        aria-label="${day} ${MONTHS[viewMonth]} ${viewYear}">${day}</button>`;
    }
    days.innerHTML = html;
  }

  function syncToPlannerMonth(){
    if(typeof currentDate === 'undefined' || !(currentDate instanceof Date)) return;
    viewYear = currentDate.getFullYear();
    viewMonth = currentDate.getMonth();
    renderSidebarCalendar();
  }

  function init(){
    if(!ensureSidebarCalendar()) return;
    syncToPlannerMonth();

    // Se la settimana cambia con frecce, OGGI o tendina, riallinea il mini calendario.
    const range = document.getElementById('weekRange');
    if(range){
      new MutationObserver(() => syncToPlannerMonth())
        .observe(range,{childList:true,characterData:true,subtree:true});
    }

    document.getElementById('monthSelect')?.addEventListener('change', event => {
      const [y,m] = String(event.target.value).split('-').map(Number);
      if(Number.isFinite(y) && Number.isFinite(m)){
        viewYear = y;
        viewMonth = m;
        renderSidebarCalendar();
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();


/* V44 FIX - tendina "Invia a una data", senza modificare il loader */
(() => {
  'use strict';

  function initV44QuickTaskAccordion(){
    const quickInput = document.getElementById('quickTaskText');
    const card = quickInput?.closest('.side-card');
    if(!card || card.dataset.v44Ready === '1') return;

    const oldTitle = card.querySelector('.side-title');
    const form = card.querySelector('.quick-task-form');
    const help = card.querySelector('.quick-help');
    if(!oldTitle || !form) return;

    card.dataset.v44Ready = '1';
    card.classList.add('v44-quick-card');

    // Elimina definitivamente la frase sotto il modulo.
    if(help) help.remove();

    // Sostituisce solo la testata, lasciando intatti input e relativi listener.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'v44-quick-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `
      <span class="v44-quick-title">Invia a una data</span>
      <span class="v44-quick-right">
        <span>Cose da fare</span>
        <span class="v44-chevron" aria-hidden="true">⌄</span>
      </span>
    `;
    oldTitle.replaceWith(toggle);

    // Nasconde/mostra direttamente il form già esistente.
    form.classList.add('v44-quick-form');
    form.hidden = true;

    function setOpen(open){
      card.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      form.hidden = !open;
    }

    toggle.addEventListener('click', () => {
      setOpen(!card.classList.contains('is-open'));
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initV44QuickTaskAccordion, {once:true});
  }else{
    initV44QuickTaskAccordion();
  }
})();
