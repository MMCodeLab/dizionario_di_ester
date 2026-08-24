/* Logica applicativa: contenuti delle pagine, ricerca, form, indice alfabetico. */
(() => {
  const ENTRIES_PER_PAGE_DESKTOP = 4;
  const MOBILE_QUERY = '(max-width: 640px)';
  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  const isSingleMode = () => mobileMedia.matches;
  const entriesPerPage = () => (isSingleMode() ? 1 : ENTRIES_PER_PAGE_DESKTOP);
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const TIPO_ABBR = {
    sostantivo: 's.',
    verbo: 'v.',
    aggettivo: 'agg.',
    avverbio: 'avv.',
    esclamazione: 'escl.',
    altro: 'altro',
  };

  let words = [];
  let pageWordRanges = []; // per pagina fisica: { first, last } lettere iniziali, o null
  let pendingPulseId = null;
  let editingId = null;
  let pendingDeleteId = null;

  const $ = (sel) => document.querySelector(sel);
  const el = {
    cover: $('#cover'),
    openBookBtn: $('#openBookBtn'),
    library: $('#library'),
    wordCount: $('#wordCount'),
    searchInput: $('#searchInput'),
    searchClear: $('#searchClear'),
    searchResults: $('#searchResults'),
    addWordBtn: $('#addWordBtn'),
    thumbIndex: $('#thumbIndex'),
    prevBtn: $('#prevBtn'),
    nextBtn: $('#nextBtn'),
    pageIndicator: $('#pageIndicator'),
    pageLeft: $('#pageLeft'),
    pageRight: $('#pageRight'),
    book: $('#book'),
    modalOverlay: $('#modalOverlay'),
    wordForm: $('#wordForm'),
    cardKicker: $('#cardKicker'),
    fieldWord: $('#fieldWord'),
    fieldTipo: $('#fieldTipo'),
    fieldDef: $('#fieldDef'),
    fieldEsempio: $('#fieldEsempio'),
    deleteWordBtn: $('#deleteWordBtn'),
    cancelWordBtn: $('#cancelWordBtn'),
    closeModalBtn: $('#closeModalBtn'),
    confirmOverlay: $('#confirmOverlay'),
    confirmText: $('#confirmText'),
    confirmOkBtn: $('#confirmOkBtn'),
    confirmCancelBtn: $('#confirmCancelBtn'),
    toast: $('#toast'),
  };

  function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c]);
  }

  function normalize(str) {
    return String(str ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  // ---------- Costruzione pagine ----------

  function buildFrontispiece() {
    const n = words.length;
    const countLabel = n === 1 ? '1 lemma raccolto' : `${n} lemmi raccolti`;
    return `
      <div class="page-inner frontispiece">
        <span class="fm-ornament">&#10086;</span>
        <h1 class="fm-title">Dizionario<br>di Ester</h1>
        <p class="fm-sub">Raccolta di parole immaginate, definite e messe per iscritto.</p>
        <p class="fm-tagline">Dalla fantasia di Ester, che &egrave; colorata e non grigia come gli altri.</p>
        <div class="fm-rule"></div>
        <p class="fm-count">${countLabel}</p>
        <p class="fm-hint">Usa la lente per cercare, oppure sfoglia le pagine per scoprirle una a una.</p>
      </div>`;
  }

  function buildEmptyPage() {
    return `
      <div class="page-inner empty-page">
        <span class="empty-ornament">&#10022;</span>
        <p class="empty-title">Nessuna parola, ancora.</p>
        <p class="empty-text">Ogni grande dizionario comincia da una prima voce.<br>Premi &laquo;Nuova parola&raquo; e inventane una.</p>
      </div>`;
  }

  function entryHTML(w) {
    const abbr = TIPO_ABBR[w.tipo] || '';
    const pulse = pendingPulseId === w.id;
    return `
      <article class="entry${pulse ? ' just-added' : ''}" data-id="${w.id}">
        <div class="entry-head">
          <h3 class="entry-word">${escapeHTML(w.word)}</h3>
          ${abbr ? `<span class="entry-tipo">${escapeHTML(abbr)}</span>` : ''}
          <span class="entry-actions">
            <button type="button" class="icon-btn edit-entry" data-id="${w.id}" aria-label="Modifica ${escapeHTML(w.word)}">&#9998;</button>
            <button type="button" class="icon-btn delete-entry" data-id="${w.id}" aria-label="Elimina ${escapeHTML(w.word)}">&#10005;</button>
          </span>
        </div>
        <p class="entry-def">${escapeHTML(w.definizione)}</p>
        ${w.esempio ? `<p class="entry-example">&laquo;${escapeHTML(w.esempio)}&raquo;</p>` : ''}
      </article>`;
  }

  function singleEntryHTML(w, pageNumberLabel) {
    const abbr = TIPO_ABBR[w.tipo] || '';
    const pulse = pendingPulseId === w.id;
    return `
      <div class="page-inner word-page-single">
        <article class="single-entry${pulse ? ' just-added' : ''}" data-id="${w.id}">
          <span class="single-actions">
            <button type="button" class="icon-btn edit-entry" data-id="${w.id}" aria-label="Modifica ${escapeHTML(w.word)}">&#9998;</button>
            <button type="button" class="icon-btn delete-entry" data-id="${w.id}" aria-label="Elimina ${escapeHTML(w.word)}">&#10005;</button>
          </span>
          <span class="single-orn">&#10086;</span>
          <h3 class="single-word">${escapeHTML(w.word)}</h3>
          ${abbr ? `<span class="single-tipo">${escapeHTML(abbr)}</span>` : ''}
          <div class="single-rule"></div>
          <p class="single-def">${escapeHTML(w.definizione)}</p>
          ${w.esempio ? `<p class="single-example">&laquo;${escapeHTML(w.esempio)}&raquo;</p>` : ''}
          <div class="single-footer">${pageNumberLabel}</div>
        </article>
      </div>`;
  }

  function buildWordPage(chunk, pageNumberLabel, single) {
    if (single) return singleEntryHTML(chunk[0], pageNumberLabel);
    const first = chunk[0].word;
    const last = chunk[chunk.length - 1].word;
    const header = chunk.length > 1
      ? `${first.toUpperCase()} &ndash; ${last.toUpperCase()}`
      : first.toUpperCase();
    return `
      <div class="page-inner word-page">
        <div class="page-header">${header}</div>
        <div class="entries">${chunk.map(entryHTML).join('')}</div>
        <div class="page-footer">${pageNumberLabel}</div>
      </div>`;
  }

  function rebuildPages(opts = {}) {
    words = Storage.getWords();
    el.wordCount.textContent = words.length === 1 ? '1 parola' : `${words.length} parole`;

    const single = isSingleMode();
    const perPage = entriesPerPage();
    const pages = [buildFrontispiece()];
    pageWordRanges = [null];

    if (words.length === 0) {
      pages.push(buildEmptyPage());
      pageWordRanges.push(null);
    } else {
      let pageNum = 1;
      for (let i = 0; i < words.length; i += perPage) {
        const chunk = words.slice(i, i + perPage);
        pages.push(buildWordPage(chunk, String(pageNum), single));
        pageWordRanges.push({
          firstLetter: normalize(chunk[0].word)[0],
          lastLetter: normalize(chunk[chunk.length - 1].word)[0],
          ids: chunk.map((w) => w.id),
        });
        pageNum++;
      }
    }

    el.book.classList.toggle('single', single);
    Book.setMode(single ? 'single' : 'spread');
    Book.setPages(pages, { keepPosition: opts.keepPosition ?? true });
    pendingPulseId = null;
    renderThumbIndex();
    updateThumbActive();
  }

  function pageIndexForWordId(id) {
    return pageWordRanges.findIndex((r) => r && r.ids && r.ids.includes(id));
  }

  function pageIndexForLetter(letter) {
    const idx = pageWordRanges.findIndex((r) => r && r.firstLetter >= letter);
    if (idx !== -1) return idx;
    // nessuna pagina con lettera >= richiesta: vai all'ultima pagina di contenuto
    for (let i = pageWordRanges.length - 1; i >= 0; i--) {
      if (pageWordRanges[i]) return i;
    }
    return 0;
  }

  // ---------- Indice alfabetico ----------

  function renderThumbIndex() {
    const present = new Set();
    pageWordRanges.forEach((r) => {
      if (!r) return;
      for (let c = r.firstLetter.charCodeAt(0); c <= r.lastLetter.charCodeAt(0); c++) {
        present.add(String.fromCharCode(c));
      }
    });
    el.thumbIndex.innerHTML = ALPHABET.map((letter) => {
      const has = present.has(letter.toLowerCase());
      return `<button type="button" class="thumb-letter${has ? '' : ' is-empty'}" data-letter="${letter.toLowerCase()}" ${has ? '' : 'disabled'}>${letter}</button>`;
    }).join('');
  }

  function updateThumbActive() {
    const spread = Book.currentSpread();
    const range = Book.getMode() === 'single'
      ? pageWordRanges[spread]
      : (pageWordRanges[spread * 2] || pageWordRanges[spread * 2 + 1]);
    const letter = range ? range.firstLetter : null;
    el.thumbIndex.querySelectorAll('.thumb-letter').forEach((btn) => {
      btn.classList.toggle('active', !!letter && btn.dataset.letter === letter);
    });
  }

  // ---------- Navigazione libro ----------

  function onSpreadChange(spread, total) {
    el.pageIndicator.textContent = `${spread + 1} / ${total}`;
    el.prevBtn.disabled = spread === 0;
    el.nextBtn.disabled = spread === total - 1;
    updateThumbActive();
  }

  function initBook() {
    Book.init({
      leftEl: el.pageLeft,
      rightEl: el.pageRight,
      flipEl: $('#flipPage'),
      flipFront: document.querySelector('#flipPage .flip-front'),
      flipBack: document.querySelector('#flipPage .flip-back'),
      spreadEl: $('#pageSpread'),
      mode: isSingleMode() ? 'single' : 'spread',
      onSpreadChange,
    });
    el.book.classList.toggle('single', isSingleMode());
  }

  // ---------- Ricerca ----------

  function runSearch(query) {
    const q = normalize(query).trim();
    el.searchClear.classList.toggle('hidden', q.length === 0);
    if (!q) {
      el.searchResults.classList.add('hidden');
      el.searchResults.innerHTML = '';
      return;
    }
    const matches = words.filter((w) => normalize(w.word).includes(q)).slice(0, 8);
    if (matches.length === 0) {
      el.searchResults.innerHTML = `<div class="search-empty">Nessuna parola trovata per &laquo;${escapeHTML(query)}&raquo;.</div>`;
      el.searchResults.classList.remove('hidden');
      return;
    }
    el.searchResults.innerHTML = matches.map((w) => `
      <button type="button" class="search-result" data-id="${w.id}">
        <span class="sr-word">${escapeHTML(w.word)}</span>
        <span class="sr-def">${escapeHTML(w.definizione.slice(0, 60))}${w.definizione.length > 60 ? '&hellip;' : ''}</span>
      </button>`).join('');
    el.searchResults.classList.remove('hidden');
  }

  function jumpToWord(id) {
    const idx = pageIndexForWordId(id);
    if (idx === -1) return;
    pendingPulseId = id;
    const rangeChunk = pageWordRanges[idx];
    // ri-renderizza il contenuto della pagina target includendo la classe di evidenziazione
    const pageEls = idx % 2 === 0 ? [idx, idx + 1] : [idx - 1, idx];
    Book.goToPage(idx, { pulse: false });
    // dopo il render statico, applichiamo manualmente la classe pulse sull'elemento giusto
    requestAnimationFrame(() => {
      const card = document.querySelector(`.entry[data-id="${id}"]`);
      if (card) {
        card.classList.add('just-added');
        card.scrollIntoView({ block: 'nearest' });
        setTimeout(() => card.classList.remove('just-added'), 1700);
      }
    });
    el.searchResults.classList.add('hidden');
  }

  // ---------- Modale parola ----------

  function openAddModal() {
    editingId = null;
    el.cardKicker.textContent = 'Nuova voce';
    el.wordForm.reset();
    el.deleteWordBtn.classList.add('hidden');
    el.modalOverlay.classList.remove('hidden');
    setTimeout(() => el.fieldWord.focus(), 50);
  }

  function openEditModal(id) {
    const w = words.find((x) => x.id === id);
    if (!w) return;
    editingId = id;
    el.cardKicker.textContent = 'Modifica voce';
    el.fieldWord.value = w.word;
    el.fieldTipo.value = w.tipo || '';
    el.fieldDef.value = w.definizione;
    el.fieldEsempio.value = w.esempio || '';
    el.deleteWordBtn.classList.remove('hidden');
    el.modalOverlay.classList.remove('hidden');
    setTimeout(() => el.fieldWord.focus(), 50);
  }

  function closeModal() {
    el.modalOverlay.classList.add('hidden');
    editingId = null;
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.remove('hidden');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.toast.classList.remove('show');
      setTimeout(() => el.toast.classList.add('hidden'), 250);
    }, 2200);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const word = el.fieldWord.value.trim();
    const definizione = el.fieldDef.value.trim();
    if (!word || !definizione) {
      if (!word) el.fieldWord.focus(); else el.fieldDef.focus();
      return;
    }
    const payload = {
      word,
      tipo: el.fieldTipo.value,
      definizione,
      esempio: el.fieldEsempio.value.trim(),
    };
    let targetId;
    if (editingId) {
      const updated = Storage.updateWord(editingId, payload);
      targetId = updated ? updated.id : editingId;
      showToast('Voce aggiornata.');
    } else {
      const created = Storage.addWord(payload);
      targetId = created.id;
      showToast('Nuova parola aggiunta al dizionario!');
    }
    closeModal();
    rebuildPages({ keepPosition: true });
    jumpToWord(targetId);
  }

  function askDelete(id) {
    const w = words.find((x) => x.id === id);
    if (!w) return;
    pendingDeleteId = id;
    el.confirmText.textContent = `Eliminare la voce "${w.word}"? L'azione non si può annullare.`;
    el.confirmOverlay.classList.remove('hidden');
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    Storage.deleteWord(pendingDeleteId);
    pendingDeleteId = null;
    el.confirmOverlay.classList.add('hidden');
    closeModal();
    rebuildPages({ keepPosition: true });
    showToast('Voce eliminata.');
  }

  // ---------- Eventi ----------

  function bindEvents() {
    el.openBookBtn.addEventListener('click', () => {
      el.cover.classList.add('closing');
      setTimeout(() => {
        el.cover.classList.add('hidden');
        el.library.classList.remove('hidden');
        requestAnimationFrame(() => el.library.classList.add('visible'));
      }, 650);
    });

    el.prevBtn.addEventListener('click', () => Book.prev());
    el.nextBtn.addEventListener('click', () => Book.next());
    el.pageLeft.addEventListener('click', (e) => {
      if (e.target.closest('.entry') || e.target.closest('button')) return;
      Book.prev();
    });
    el.pageRight.addEventListener('click', (e) => {
      if (e.target.closest('.entry') || e.target.closest('button')) return;
      Book.next();
    });

    document.addEventListener('keydown', (e) => {
      if (el.library.classList.contains('hidden')) return;
      if (!el.modalOverlay.classList.contains('hidden')) return;
      if (!el.confirmOverlay.classList.contains('hidden')) return;
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') Book.next();
      if (e.key === 'ArrowLeft') Book.prev();
    });

    el.thumbIndex.addEventListener('click', (e) => {
      const btn = e.target.closest('.thumb-letter');
      if (!btn || btn.disabled) return;
      const idx = pageIndexForLetter(btn.dataset.letter);
      Book.goToPage(idx);
    });

    el.addWordBtn.addEventListener('click', openAddModal);
    el.closeModalBtn.addEventListener('click', closeModal);
    el.cancelWordBtn.addEventListener('click', closeModal);
    el.modalOverlay.addEventListener('click', (e) => {
      if (e.target === el.modalOverlay) closeModal();
    });
    el.wordForm.addEventListener('submit', handleFormSubmit);
    el.deleteWordBtn.addEventListener('click', () => editingId && askDelete(editingId));

    el.confirmCancelBtn.addEventListener('click', () => {
      pendingDeleteId = null;
      el.confirmOverlay.classList.add('hidden');
    });
    el.confirmOkBtn.addEventListener('click', confirmDelete);
    el.confirmOverlay.addEventListener('click', (e) => {
      if (e.target === el.confirmOverlay) {
        pendingDeleteId = null;
        el.confirmOverlay.classList.add('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-entry');
      const delBtn = e.target.closest('.delete-entry');
      if (editBtn) openEditModal(editBtn.dataset.id);
      if (delBtn) askDelete(delBtn.dataset.id);
    });

    let searchDebounce;
    el.searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => runSearch(el.searchInput.value), 90);
    });
    el.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = el.searchResults.querySelector('.search-result');
        if (first) jumpToWord(first.dataset.id);
      } else if (e.key === 'Escape') {
        el.searchInput.value = '';
        runSearch('');
        el.searchInput.blur();
      }
    });
    el.searchClear.addEventListener('click', () => {
      el.searchInput.value = '';
      runSearch('');
      el.searchInput.focus();
    });
    el.searchResults.addEventListener('click', (e) => {
      const btn = e.target.closest('.search-result');
      if (btn) jumpToWord(btn.dataset.id);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) {
        el.searchResults.classList.add('hidden');
      }
    });

    const onModeBreakpointChange = () => rebuildPages({ keepPosition: true });
    if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', onModeBreakpointChange);
    else mobileMedia.addListener(onModeBreakpointChange);

    let touchStartX = null;
    let touchStartY = null;
    el.book.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });
    el.book.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      touchStartX = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) Book.next(); else Book.prev();
      }
    }, { passive: true });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('Registrazione service worker fallita:', err);
        });
      });
    }
  }

  function init() {
    initBook();
    rebuildPages({ keepPosition: false });
    bindEvents();
    registerServiceWorker();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
