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
          aria-label="Mese precedente" title="Mese precedente"></button>
        <button type="button" class="v43-month-title" id="v43MonthTitle"
          title="Apri la scelta del mese"></button>
        <button type="button" class="v43-month-arrow" id="v43NextMonth"
          aria-label="Mese successivo" title="Mese successivo"></button>
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

    // V47: le frecce mostrano il mese dove portano.
    const prevName = MONTHS[(viewMonth + 11) % 12];
    const nextName = MONTHS[(viewMonth + 1) % 12];
    const prevBtn = card.querySelector('#v43PrevMonth');
    const nextBtn = card.querySelector('#v43NextMonth');
    prevBtn.textContent = `‹ ${prevName.slice(0,3)}`;
    nextBtn.textContent = `${nextName.slice(0,3)} ›`;
    prevBtn.setAttribute('aria-label',`Vai a ${prevName}`);
    nextBtn.setAttribute('aria-label',`Vai a ${nextName}`);
    prevBtn.title = `Vai a ${prevName}`;
    nextBtn.title = `Vai a ${nextName}`;

    const first = new Date(viewYear, viewMonth, 1);
    const count = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = new Date();
    const selected = (typeof currentDate !== 'undefined' && currentDate instanceof Date)
      ? currentDate : null;

    // V47: lunedì e domenica della settimana aperta, per illuminarla.
    let weekStart = null;
    let weekEnd = null;
    if(selected){
      weekStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - mondayIndex(selected));
      weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
    }

    let html = '';
    for(let i=0; i<mondayIndex(first); i++){
      html += '<span class="v43-empty" aria-hidden="true"></span>';
    }

    for(let day=1; day<=count; day++){
      const date = new Date(viewYear, viewMonth, day);
      const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const inWeek = weekStart && date >= weekStart && date <= weekEnd;
      const cls = [
        'v43-day',
        sameDate(date,today) ? 'today' : '',
        sameDate(date,selected) ? 'selected' : '',
        inWeek ? 'in-week' : '',
        inWeek && (day === 1 || mondayIndex(date) === 0) ? 'week-first' : '',
        inWeek && (day === count || mondayIndex(date) === 6) ? 'week-last' : ''
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

/* =====================================================================
   PLANNER V46 - SINCRONIZZAZIONE CALENDARIO
   1. Ore e Cose da fare si salvano mentre scrivi, come le Note.
   2. Tornando sull'app rilegge la settimana direttamente dal server.
   3. Recupera i giorni scritti senza accesso e li unisce a quelli online.
   ===================================================================== */
(() => {
  'use strict';

  const SAVE_DELAY = 600;
  const FIELDS = '[data-hour-input], [data-task-text]';
  const timers = new Map();
  let resyncTimer = null;
  let resyncRunning = false;

  function commitField(field){
    clearTimeout(timers.get(field));
    timers.delete(field);
    if(field.isConnected) field.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function flushFields(){
    Array.from(timers.keys()).forEach(commitField);
    const active = document.activeElement;
    if(active?.matches?.('[data-hour-input], [data-task-text], [data-hour-minute]')){
      active.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function dayHasPendingText(key){
    return Array.from(timers.keys()).some(field =>
      field.closest('.day[data-key]')?.dataset.key === key
    );
  }

  document.addEventListener('input', event => {
    const field = event.target;
    if(!field?.matches?.(FIELDS)) return;
    clearTimeout(timers.get(field));
    timers.set(field, setTimeout(() => commitField(field), SAVE_DELAY));
  });

  async function resyncWeek(){
    if(resyncRunning || !currentUser || !navigator.onLine) return;
    resyncRunning = true;
    try{
      flushFields();
      const results = await Promise.all(currentWeekDates().map(async date => ({
        date,
        snap: await dayRefFromKey(dateKey(date)).get({source:'server'})
      })));

      results.forEach(({date,snap}) => {
        const key = dateKey(date);
        if(dayHasPendingText(key)) return;
        dataCache[key] = snap.exists ? normalizeDay(snap.data()) : emptyDay();
        refreshDayUI(date);
      });

      await renderUpcomingPanels();
      const time = new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      setSyncNotice(`Agenda sincronizzata con ${currentUser.email || 'il tuo account Google'} · controllo ore ${time}.`);
    }catch(error){
      console.error('Rilettura dal server non riuscita', error);
      setSyncNotice('Attenzione: non riesco a leggere i dati dal server. Quello che vedi potrebbe non essere aggiornato.');
    }finally{
      resyncRunning = false;
    }
  }

  function scheduleResync(){
    clearTimeout(resyncTimer);
    resyncTimer = setTimeout(resyncWeek, 400);
  }

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden') flushFields();
    else scheduleResync();
  });
  window.addEventListener('pagehide', flushFields);
  window.addEventListener('pageshow', scheduleResync);
  window.addEventListener('focus', scheduleResync);
  window.addEventListener('online', scheduleResync);

  function mergeLocalIntoRemote(remote, local){
    let added = 0;
    const sameText = (a,b) => String(a||'').trim() === String(b||'').trim();

    Object.entries(local.hours).forEach(([hour,entry]) => {
      if(!String(entry.text||'').trim()) return;
      const current = remote.hours[hour];
      if(!String(current?.text||'').trim()){
        remote.hours[hour] = entry;
        added++;
      }else if(!sameText(current.text,entry.text) &&
               !remote.extraHours.some(row => sameText(row.text,entry.text))){
        remote.extraHours.push({
          id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,
          baseHour:hour, text:entry.text, done:entry.done, minutes:entry.minutes
        });
        added++;
      }
    });

    local.extraHours.forEach(row => {
      if(!String(row.text||'').trim()) return;
      if(remote.extraHours.some(item => String(item.id) === String(row.id) || sameText(item.text,row.text))) return;
      remote.extraHours.push(row);
      added++;
    });

    local.tasks.forEach(task => {
      if(!String(task.text||'').trim()) return;
      if(remote.tasks.some(item => String(item.id) === String(task.id) || sameText(item.text,task.text))) return;
      remote.tasks.push(task);
      added++;
    });

    return added;
  }

  async function recoverLocalDays(){
    const keys = [];
    for(let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if(key && /^day:\d{4}-\d{2}-\d{2}$/.test(key)) keys.push(key);
    }

    let recovered = 0;
    for(const key of keys){
      try{
        const day = key.slice(4);
        const local = normalizeDay(JSON.parse(localStorage.getItem(key)));
        const ref = dayRefFromKey(day);
        const snap = await ref.get({source:'server'});
        const remote = snap.exists ? normalizeDay(snap.data()) : emptyDay();
        if(mergeLocalIntoRemote(remote,local) > 0){
          await ref.set({
            hours:remote.hours, extraHours:remote.extraHours, tasks:remote.tasks,
            updatedAt:serverTimestamp()
          });
          recovered++;
        }
        delete dataCache[day];
        localStorage.removeItem(key);
      }catch(error){
        // In caso di errore il giorno resta sul dispositivo e si ritenta al prossimo avvio.
        console.warn('Recupero giorno locale non riuscito', key, error);
      }
    }
    return recovered;
  }

  auth.onAuthStateChanged(user => {
    if(!user) return;
    let attempts = 0;
    const start = async () => {
      if(!currentUser){
        if(++attempts < 40) setTimeout(start,250);
        return;
      }
      await recoverLocalDays();
      await resyncWeek();
    };
    setTimeout(start,500);
  });
})();
