(function(){
  'use strict';

  if(window.__plannerPatchV3Loaded) return;
  window.__plannerPatchV3Loaded = true;

  function normalizeMinute(value){
    const digits = String(value ?? '00').replace(/\D/g,'').slice(0,2);
    if(digits === '') return '00';
    const number = Math.max(0, Math.min(59, Number(digits)));
    return String(number).padStart(2,'0');
  }

  function dateFromKey(key){
    const parts = String(key || '').split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const originalNormalizeDay = normalizeDay;
  normalizeDay = function(value){
    const minuteValues = {};
    const sourceHours = value && typeof value === 'object' && value.hours && typeof value.hours === 'object'
      ? value.hours
      : {};

    Object.keys(sourceHours).forEach(hour=>{
      const entry = sourceHours[hour];
      if(entry && typeof entry === 'object'){
        const legacyMinute = typeof entry.time === 'string' ? entry.time.slice(3,5) : undefined;
        minuteValues[hour] = normalizeMinute(entry.minutes ?? legacyMinute ?? '00');
      }
    });

    const normalized = originalNormalizeDay(value);
    Object.keys(normalized.hours).forEach(hour=>{
      normalized.hours[hour].minutes = minuteValues[hour] ?? '00';
    });
    return normalized;
  };

  renderHours = function(container, d, val){
    const now = new Date();
    const nowHour = now.getHours();
    const isToday = sameDay(d, now);

    container.innerHTML = HOURS.map(hour=>{
      const hourNumber = parseInt(hour.slice(0,2),10);
      const isNow = isToday && hourNumber === nowHour;
      const entry = val.hours[hour] || {text:'', done:false, minutes:'00'};
      const minutes = normalizeMinute(entry.minutes);

      return `<div class="hour-row ${isNow?'now':''} ${entry.done?'hour-done':''}">
        <input type="checkbox" class="hour-check" data-hour-check="${hour}" ${entry.done?'checked':''}
          title="Attiva o disattiva il flag">
        <span class="hour-label">
          <span class="hour-fixed">${hour.slice(0,2)}:</span>
          <input type="text" class="hour-minute" inputmode="numeric" maxlength="2"
            value="${minutes}" data-hour-minute="${hour}"
            aria-label="Minuti delle ${hour.slice(0,2)}"
            title="Modifica i minuti da 00 a 59">
        </span>
        <textarea class="hour-input" rows="1" data-hour-input="${hour}" placeholder=""
          title="Ctrl + 1 per attivare o disattivare il flag">${escapeHTML(entry.text)}</textarea>
      </div>`;
    }).join('');

    container.querySelectorAll('.hour-input').forEach(textarea=>autoGrow(textarea));
  };

  const style = document.createElement('style');
  style.id = 'planner-patch-v3-style';
  style.textContent = `
    .hour-label{
      width:42px !important;
      display:flex;
      align-items:center;
      flex-shrink:0;
      margin-top:3px;
      gap:0;
    }
    .hour-fixed{color:var(--text-dim);}
    .hour-minute{
      width:18px;
      min-width:18px;
      padding:0;
      margin:0;
      border:0;
      border-bottom:1px solid transparent;
      border-radius:0;
      background:transparent;
      color:var(--text-dim);
      font:inherit;
      line-height:inherit;
      text-align:left;
      outline:none;
    }
    .hour-minute:hover{
      color:var(--text);
      border-bottom-color:var(--line);
    }
    .hour-minute:focus{
      color:var(--text);
      border-bottom-color:var(--accent);
      outline:none;
    }
    .hour-row.hour-done .hour-input,
    .todo-item.done .todo-text{
      text-decoration:none !important;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('input', event=>{
    const input = event.target.closest?.('[data-hour-minute]');
    if(!input) return;
    input.value = input.value.replace(/\D/g,'').slice(0,2);
  }, true);

  document.addEventListener('focusin', event=>{
    const input = event.target.closest?.('[data-hour-minute]');
    if(input) input.select();
  }, true);

  document.addEventListener('change', async event=>{
    const input = event.target.closest?.('[data-hour-minute]');
    if(!input) return;

    event.stopPropagation();
    const card = input.closest('.day[data-key]');
    if(!card) return;

    const date = dateFromKey(card.dataset.key);
    const hour = input.dataset.hourMinute;
    const minutes = normalizeMinute(input.value);
    input.value = minutes;

    const value = await loadDay(date);
    if(!value.hours[hour]) value.hours[hour] = {text:'', done:false, minutes:'00'};
    value.hours[hour].minutes = minutes;
    await saveDay(date);
  }, true);

  document.addEventListener('keydown', event=>{
    const shortcut =
      event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      (event.key === '1' || event.code === 'Digit1');

    if(!shortcut) return;

    const row = event.target.closest?.('.hour-row');
    if(!row) return;

    const checkbox = row.querySelector('[data-hour-check]');
    if(!checkbox) return;

    event.preventDefault();
    event.stopPropagation();
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change', {bubbles:true}));
  }, true);

  setTimeout(()=>{
    if(typeof render === 'function') render();
  }, 0);
})();
