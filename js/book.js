/*
 * Motore generico "libro sfogliabile". Non conosce il contenuto: riceve un
 * array di HTML (una stringa per pagina) e lo mostra in due modalità:
 *  - "spread": doppia pagina affiancata (desktop/tablet), come un libro aperto
 *  - "single": una pagina sola a schermo intero (mobile), che si gira
 *    interamente con un effetto di rotazione, senza scroll interno
 */
const Book = (() => {
  let els = null;
  let pages = [];          // array di stringhe HTML, una per pagina fisica
  let mode = 'spread';      // 'spread' | 'single'
  let currentSpread = 0;    // indice della vista corrente (spread o singola pagina)
  let animating = false;
  let onSpreadChange = () => {};

  function blankPage() {
    return '<div class="page-blank"><span class="blank-ornament">&#10087;</span></div>';
  }

  function html(index) {
    if (index < 0 || index >= pages.length) return blankPage();
    return pages[index] ?? blankPage();
  }

  function pagesPerView() {
    return mode === 'single' ? 1 : 2;
  }

  function totalSpreads() {
    return Math.max(1, Math.ceil(pages.length / pagesPerView()));
  }

  function renderStatic() {
    if (mode === 'single') {
      els.rightEl.innerHTML = html(currentSpread);
      els.leftEl.innerHTML = '';
    } else {
      els.leftEl.innerHTML = html(currentSpread * 2);
      els.rightEl.innerHTML = html(currentSpread * 2 + 1);
    }
    updateNav();
  }

  function updateNav() {
    onSpreadChange(currentSpread, totalSpreads());
  }

  function resetFlipEl() {
    els.flipEl.className = 'flip-page';
    els.flipEl.style.transition = 'none';
    els.flipEl.style.transform = 'rotateY(0deg)';
    els.flipFront.innerHTML = '';
    els.flipBack.innerHTML = '';
  }

  function canNext() {
    return currentSpread < totalSpreads() - 1;
  }
  function canPrev() {
    return currentSpread > 0;
  }

  function bounce(side) {
    const target = side === 'right' ? els.rightEl : els.leftEl;
    target.classList.remove('bounce-r', 'bounce-l');
    void target.offsetWidth; // forza reflow per poter ripetere l'animazione
    target.classList.add(side === 'right' ? 'bounce-r' : 'bounce-l');
    setTimeout(() => target.classList.remove('bounce-r', 'bounce-l'), 260);
  }

  // ---------- modalità "spread" (due pagine affiancate) ----------

  function nextSpread() {
    const target = currentSpread + 1;
    const nextLeftHTML = html(target * 2);
    const nextRightHTML = html(target * 2 + 1);
    const currentRightHTML = html(currentSpread * 2 + 1);

    els.flipEl.className = 'flip-page over-right';
    els.flipEl.style.transition = 'none';
    els.flipEl.style.transform = 'rotateY(0deg)';
    els.flipFront.innerHTML = currentRightHTML;
    els.flipBack.innerHTML = nextLeftHTML;
    els.rightEl.innerHTML = nextRightHTML;

    void els.flipEl.offsetWidth;
    els.flipEl.style.transition = '';
    els.flipEl.classList.add('animating');
    requestAnimationFrame(() => { els.flipEl.style.transform = 'rotateY(-180deg)'; });

    const onEnd = (e) => {
      if (e && e.propertyName !== 'transform') return;
      els.flipEl.removeEventListener('transitionend', onEnd);
      els.leftEl.innerHTML = nextLeftHTML;
      resetFlipEl();
      currentSpread = target;
      animating = false;
      updateNav();
    };
    els.flipEl.addEventListener('transitionend', onEnd);
  }

  function prevSpread() {
    const target = currentSpread - 1;
    const prevLeftHTML = html(target * 2);
    const prevRightHTML = html(target * 2 + 1);
    const currentLeftHTML = html(currentSpread * 2);

    els.flipEl.className = 'flip-page over-left';
    els.flipEl.style.transition = 'none';
    els.flipEl.style.transform = 'rotateY(0deg)';
    els.flipFront.innerHTML = currentLeftHTML;
    els.flipBack.innerHTML = prevRightHTML;
    els.leftEl.innerHTML = prevLeftHTML;

    void els.flipEl.offsetWidth;
    els.flipEl.style.transition = '';
    els.flipEl.classList.add('animating');
    requestAnimationFrame(() => { els.flipEl.style.transform = 'rotateY(180deg)'; });

    const onEnd = (e) => {
      if (e && e.propertyName !== 'transform') return;
      els.flipEl.removeEventListener('transitionend', onEnd);
      els.rightEl.innerHTML = prevRightHTML;
      resetFlipEl();
      currentSpread = target;
      animating = false;
      updateNav();
    };
    els.flipEl.addEventListener('transitionend', onEnd);
  }

  // ---------- modalità "single" (una pagina a schermo intero) ----------
  // La pagina che gira ruota sempre attorno al bordo sinistro: in avanti
  // "esce di scena" ruotando oltre i 90°, indietro "entra in scena" allo
  // stesso modo. Serve solo la faccia frontale (oltre i 90° sparisce da
  // sola grazie a backface-visibility, niente bisogno di una faccia sul retro).

  function nextSingle() {
    const target = currentSpread + 1;
    const outgoingHTML = html(currentSpread);
    const incomingHTML = html(target);

    els.flipEl.className = 'flip-page single-flip';
    els.flipEl.style.transition = 'none';
    els.flipEl.style.transform = 'rotateY(0deg)';
    els.flipFront.innerHTML = outgoingHTML;
    els.flipBack.innerHTML = '';
    els.rightEl.innerHTML = incomingHTML;

    void els.flipEl.offsetWidth;
    els.flipEl.style.transition = '';
    els.flipEl.classList.add('animating');
    requestAnimationFrame(() => { els.flipEl.style.transform = 'rotateY(-100deg)'; });

    const onEnd = (e) => {
      if (e && e.propertyName !== 'transform') return;
      els.flipEl.removeEventListener('transitionend', onEnd);
      resetFlipEl();
      currentSpread = target;
      animating = false;
      updateNav();
    };
    els.flipEl.addEventListener('transitionend', onEnd);
  }

  function prevSingle() {
    const target = currentSpread - 1;
    const incomingHTML = html(target);

    els.flipEl.className = 'flip-page single-flip';
    els.flipEl.style.transition = 'none';
    els.flipEl.style.transform = 'rotateY(-100deg)';
    els.flipFront.innerHTML = incomingHTML;
    els.flipBack.innerHTML = '';

    void els.flipEl.offsetWidth;
    els.flipEl.style.transition = '';
    els.flipEl.classList.add('animating');
    requestAnimationFrame(() => { els.flipEl.style.transform = 'rotateY(0deg)'; });

    const onEnd = (e) => {
      if (e && e.propertyName !== 'transform') return;
      els.flipEl.removeEventListener('transitionend', onEnd);
      els.rightEl.innerHTML = incomingHTML;
      resetFlipEl();
      currentSpread = target;
      animating = false;
      updateNav();
    };
    els.flipEl.addEventListener('transitionend', onEnd);
  }

  // ---------- API comune ----------

  function next() {
    if (animating) return;
    if (!canNext()) { bounce('right'); return; }
    animating = true;
    if (mode === 'single') nextSingle(); else nextSpread();
  }

  function prev() {
    if (animating) return;
    if (!canPrev()) { bounce('left'); return; }
    animating = true;
    if (mode === 'single') prevSingle(); else prevSpread();
  }

  function goToPage(pageIndex, opts = {}) {
    const target = Math.max(0, Math.min(pages.length - 1, pageIndex));
    const targetSpread = mode === 'single' ? target : Math.floor(target / 2);
    if (targetSpread === currentSpread) {
      if (opts.pulse) pulsePage(mode === 'single' || target % 2 === 1 ? 'right' : 'left');
      return;
    }
    animating = false;
    resetFlipEl();
    currentSpread = targetSpread;
    els.spreadEl.classList.remove('settle');
    void els.spreadEl.offsetWidth;
    renderStatic();
    els.spreadEl.classList.add('settle');
    if (opts.pulse) {
      setTimeout(() => pulsePage(mode === 'single' || target % 2 === 1 ? 'right' : 'left'), 260);
    }
  }

  function pulsePage(side) {
    const target = side === 'right' ? els.rightEl : els.leftEl;
    const card = target.querySelector('.entry.just-added, .entry[data-pulse="1"]');
    (card || target).classList.add('pulse-highlight');
    setTimeout(() => (card || target).classList.remove('pulse-highlight'), 1600);
  }

  function setMode(newMode) {
    if (mode === newMode) return;
    animating = false;
    mode = newMode;
    currentSpread = Math.min(currentSpread, totalSpreads() - 1);
    resetFlipEl();
    if (els) renderStatic();
  }

  function setPages(newPages, opts = {}) {
    pages = newPages;
    if (!opts.keepPosition) currentSpread = 0;
    else currentSpread = Math.min(currentSpread, totalSpreads() - 1);
    resetFlipEl();
    renderStatic();
  }

  function init(config) {
    els = config;
    onSpreadChange = config.onSpreadChange || onSpreadChange;
    if (config.mode) mode = config.mode;
    resetFlipEl();
  }

  return {
    init,
    setPages,
    setMode,
    getMode: () => mode,
    next,
    prev,
    goToPage,
    currentSpread: () => currentSpread,
    totalSpreads,
    isAnimating: () => animating,
  };
})();
