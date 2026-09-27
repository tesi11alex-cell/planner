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


/* V45 - tendina Invia a una data + disattivazione calendario popup del selettore mese */
(() => {
  'use strict';

  function disableOldMonthPopup(){
    const select = document.getElementById('monthSelect');
    const popup = document.getElementById('miniCalendar');

    // Il popup calendario non deve mai comparire.
    if(popup){
      popup.hidden = true;
      popup.style.display = 'none';
      popup.setAttribute('aria-hidden','true');
    }

    if(!select || select.dataset.v45MonthReady === '1') return;
    select.dataset.v45MonthReady = '1';

    // Blocca i listener click/change precedenti solo per il popup,
    // mantenendo il normale comportamento nativo della select.
    select.addEventListener('click', () => {
      if(popup){
        popup.hidden = true;
        popup.style.display = 'none';
      }
    }, true);

    select.addEventListener('change', () => {
      if(popup){
        popup.hidden = true;
        popup.style.display = 'none';
      }
    }, true);

    // Se qualche vecchio listener prova a riaprirlo, lo richiudiamo subito.
    if(popup){
      new MutationObserver(() => {
        if(!popup.hidden || popup.style.display !== 'none'){
          popup.hidden = true;
          popup.style.display = 'none';
        }
      }).observe(popup,{attributes:true,attributeFilter:['hidden','style']});
    }
  }

  function initQuickTaskDropdown(){
    const input = document.getElementById('quickTaskText');
    const card = input?.closest('.side-card');
    if(!card || card.dataset.v45QuickReady === '1') return;

    const oldTitle = card.querySelector('.side-title');
    const form = card.querySelector('.quick-task-form');
    const help = card.querySelector('.quick-help');
    if(!oldTitle || !form) return;

    card.dataset.v45QuickReady = '1';
    card.classList.add('v45-quick-card');

    // Rimuove la frase di aiuto sotto.
    help?.remove();

    // Testata cliccabile.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'v45-quick-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = `
      <span class="v45-quick-title">Invia a una data</span>
      <span class="v45-quick-right">
        <span>Cose da fare</span>
        <span class="v45-chevron" aria-hidden="true">⌄</span>
      </span>
    `;
    oldTitle.replaceWith(toggle);

    form.classList.add('v45-quick-form');
    form.hidden = true;

    const setOpen = open => {
      card.classList.toggle('is-open', open);
      form.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    setOpen(false);
    toggle.addEventListener('click', () => setOpen(!card.classList.contains('is-open')));
  }

  function initV45(){
    disableOldMonthPopup();
    initQuickTaskDropdown();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initV45, {once:true});
  }else{
    initV45();
  }
})();
