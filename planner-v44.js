(() => {
  'use strict';

  function initQuickTaskAccordion(){
    const sidebar = document.querySelector('.desktop-sidebar');
    if(!sidebar) return;

    const quickInput = document.getElementById('quickTaskText');
    const quickCard = quickInput?.closest('.side-card');
    if(!quickCard || quickCard.classList.contains('v44-quick-card')) return;

    const title = quickCard.querySelector('.side-title');
    const form = quickCard.querySelector('.quick-task-form');
    const help = quickCard.querySelector('.quick-help');
    if(!title || !form) return;

    // La frase di aiuto richiesta viene rimossa completamente.
    help?.remove();

    quickCard.classList.add('v44-quick-card');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'v44-quick-toggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML = `
      <span class="v44-toggle-copy">
        <h2>Invia a una data</h2>
        <span class="v44-toggle-right">
          <span>Cose da fare</span>
          <span class="v44-quick-chevron" aria-hidden="true">⌄</span>
        </span>
      </span>
    `;

    title.replaceWith(toggle);

    const body = document.createElement('div');
    body.className = 'v44-quick-body';
    const inner = document.createElement('div');
    form.parentNode.insertBefore(body, form);
    body.appendChild(inner);
    inner.appendChild(form);

    function setOpen(open){
      quickCard.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    // Parte chiusa: si legge solo "Invia a una data" / "Cose da fare".
    setOpen(false);

    toggle.addEventListener('click', () => {
      setOpen(!quickCard.classList.contains('is-open'));
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initQuickTaskAccordion, {once:true});
  }else{
    initQuickTaskAccordion();
  }
})();
