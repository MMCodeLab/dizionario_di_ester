/* Livello di persistenza: le parole di Ester vivono in localStorage. */
const Storage = (() => {
  const KEY = 'dizionarioEster.parole.v1';

  // Parole precaricate: compaiono solo la primissima volta che l'app viene
  // aperta su un dispositivo (localStorage ancora vuoto). Se poi vengono
  // cancellate, il dizionario resta vuoto e non ricompaiono da sole.
  const DEFAULT_WORDS = [
    {
      id: 'default-petaloso',
      word: 'Petaloso',
      tipo: 'aggettivo',
      definizione: "Persona con aria in pancia che, appena viene liberata, si trasforma: i piedi prendono la forma di petali. Da non confondere con i petali del fiore. Si consiglia di allontanarsi, perché i petali potrebbero causare nausee.",
      esempio: 'Come sei petaloso... hai mangiato fagioli ieri?',
      createdAt: 0,
    },
    {
      id: 'default-orchite',
      word: 'Orchite',
      tipo: 'sostantivo',
      definizione: 'Deriva da Shrek: persona che, arrabbiandosi o stando per svalvolare, diventa verde e grossa come un orco.',
      esempio: "Mi sta venendo l'orchite.",
      createdAt: 0,
    },
    {
      id: 'default-brancaglione',
      word: 'Brancaglione',
      tipo: 'sostantivo',
      definizione: 'Donna scienziata saputella che sa sempre tutto di tutti e campa 100 anni.',
      esempio: '',
      createdAt: 0,
    },
    {
      id: 'default-niki-lauga',
      word: 'Niki Lauga',
      tipo: 'sostantivo',
      definizione: 'Considerato uno dei migliori piloti della storia, era soprannominato "il computer" per via della sua freddezza al volante. Ha preso il via in 171 Gran Premi, vincendone 25, con 24 pole position e altrettanti giri veloci. Il più simpatico.',
      esempio: '',
      createdAt: 0,
    },
    {
      id: 'default-elton-senna',
      word: 'Elton Senna',
      tipo: 'sostantivo',
      definizione: 'Pilota brasiliano di Formula 1, tre volte campione del mondo, noto per il suo talento straordinario, la guida aggressiva e la capacità di eccellere in condizioni difficili. Il più simpatico.',
      esempio: '',
      createdAt: 0,
    },
    {
      id: 'default-stretto-di-humus',
      word: 'Stretto di humus',
      tipo: 'sostantivo',
      definizione: 'Da non confondere con i ceci: è uno stretto dove, al momento, tutte le navi si guardano.',
      esempio: '',
      createdAt: 0,
    },
    {
      id: 'default-ciapp-gpt',
      word: 'Ciapp gpt',
      tipo: 'sostantivo',
      definizione: 'Chatbot basato su intelligenza artificiale, in grado di comprendere e generare testo in linguaggio naturale.',
      esempio: '',
      createdAt: 0,
    },
    {
      id: 'default-flautolenza',
      word: 'Flautolenza',
      tipo: 'sostantivo',
      definizione: "Bollicina che fluttua nell'aria, a volte di colore verde. Potrebbe sembrare simpatica, ma è molto pericolosa.",
      esempio: '',
      createdAt: 0,
    },
  ];

  function uid() {
    return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // primo avvio in assoluto: pianta le parole precaricate
        saveAll(DEFAULT_WORDS);
        return DEFAULT_WORDS.slice();
      }
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
