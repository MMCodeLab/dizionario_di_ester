/* Livello di persistenza: le parole di Ester vivono in localStorage. */
const Storage = (() => {
  const KEY = 'dizionarioEster.parole.v1';

  function uid() {
    return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Dizionario: dati corrotti in localStorage, riparto da zero.', e);
      return [];
    }
  }

  function saveAll(words) {
    localStorage.setItem(KEY, JSON.stringify(words));
  }

  function getWords() {
    return loadAll().sort((a, b) =>
      a.word.localeCompare(b.word, 'it', { sensitivity: 'base' })
    );
  }

  function addWord({ word, tipo, definizione, esempio }) {
    const words = loadAll();
    const entry = {
      id: uid(),
      word: word.trim(),
      tipo: (tipo || '').trim(),
      definizione: definizione.trim(),
      esempio: (esempio || '').trim(),
      createdAt: Date.now(),
    };
    words.push(entry);
    saveAll(words);
    return entry;
  }

  function updateWord(id, { word, tipo, definizione, esempio }) {
    const words = loadAll();
    const idx = words.findIndex((w) => w.id === id);
    if (idx === -1) return null;
    words[idx] = {
      ...words[idx],
      word: word.trim(),
      tipo: (tipo || '').trim(),
      definizione: definizione.trim(),
      esempio: (esempio || '').trim(),
    };
    saveAll(words);
    return words[idx];
  }

  function deleteWord(id) {
    const words = loadAll().filter((w) => w.id !== id);
    saveAll(words);
  }

  return { getWords, addWord, updateWord, deleteWord };
})();
