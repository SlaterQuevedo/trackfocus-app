// js/institutions.js — Catálogo de instituciones peruanas para Ariven
window.Institutions = (() => {

  const MALLAS = {
    ing:  ['Álgebra', 'Aritmética', 'Geometría', 'Trigonometría', 'Física', 'Química', 'R. Matemático', 'R. Verbal'],
    bio:  ['Biología', 'Química', 'Física', 'Álgebra', 'Aritmética', 'Geometría', 'Historia del Perú', 'Comprensión Lectora', 'R. Verbal'],
    hum:  ['Historia del Perú', 'Historia Universal', 'Geografía', 'Literatura', 'Filosofía', 'Comprensión Lectora', 'R. Verbal', 'Economía'],
    gen:  ['Álgebra', 'Aritmética', 'Geometría', 'Física', 'Química', 'Historia del Perú', 'Geografía', 'Comprensión Lectora', 'R. Verbal'],
    tec:  ['Matemáticas', 'Física', 'Química', 'R. Matemático', 'R. Verbal', 'Comprensión Lectora'],
    mil:  ['Matemáticas', 'Física', 'Historia del Perú', 'Historia Universal', 'Geografía', 'Comprensión Lectora', 'R. Verbal', 'Cívica'],
    eco:  ['Matemáticas', 'Estadística', 'Economía', 'Comprensión Lectora', 'R. Verbal', 'Historia del Perú', 'Geografía'],
    beca: ['Comprensión Lectora', 'R. Verbal', 'R. Matemático', 'Pensamiento Crítico', 'Hábitos de Estudio']
  };

  const CATS = {
    'univ-pub':  { label: 'Universidad Pública',   icon: '🎓', badge: 'Pública',   cls: 'pub'   },
    'univ-priv': { label: 'Universidad Privada',    icon: '🎓', badge: 'Privada',   cls: 'priv'  },
    'instituto': { label: 'Instituto / Escuela',    icon: '🏫', badge: 'Instituto', cls: 'inst'  },
    'pnp':       { label: 'Policía Nacional',       icon: '👮', badge: 'PNP',       cls: 'pnp'   },
    'ejercito':  { label: 'Ejército del Perú',      icon: '⚔️', badge: 'Ejército',  cls: 'mil'   },
    'marina':    { label: 'Marina de Guerra',       icon: '⚓', badge: 'Marina',    cls: 'mil'   },
    'fap':       { label: 'Fuerza Aérea',           icon: '✈️', badge: 'FAP',       cls: 'mil'   },
    'beca':      { label: 'Programa de Becas',      icon: '🏆', badge: 'Beca',      cls: 'beca'  },
  };

  const DATA = [
    // ── Universidades Públicas (Lima/Callao) ──
    { id:'UNMSM',      name:'Universidad Nacional Mayor de San Marcos',                              abbr:'UNMSM',      aliases:['San Marcos','Decana de América'],                      cat:'univ-pub',  city:'Lima',              dept:'Lima',           malla:'bio'  },
    { id:'UNI',        name:'Universidad Nacional de Ingeniería',                                    abbr:'UNI',        aliases:['La Nacional'],                                         cat:'univ-pub',  city:'Lima',              dept:'Lima',           malla:'ing'  },
    { id:'UNALM',      name:'Universidad Nacional Agraria La Molina',                                abbr:'UNALM',      aliases:['La Molina','La Agraria','Agraria'],                    cat:'univ-pub',  city:'Lima',              dept:'Lima',           malla:'bio'  },
    { id:'UNFV',       name:'Universidad Nacional Federico Villarreal',                              abbr:'UNFV',       aliases:['Villarreal','Federico Villarreal'],                    cat:'univ-pub',  city:'Lima',              dept:'Lima',           malla:'gen'  },
    { id:'UNAC',       name:'Universidad Nacional del Callao',                                       abbr:'UNAC',       aliases:['Callao'],                                              cat:'univ-pub',  city:'Callao',            dept:'Callao',         malla:'ing'  },
    { id:'UNE',        name:'Universidad Nacional de Educación Enrique Guzmán y Valle',              abbr:'UNE',        aliases:['La Cantuta','Cantuta','Guzmán y Valle'],               cat:'univ-pub',  city:'Chosica',           dept:'Lima',           malla:'hum'  },
    // ── Universidades Públicas (Norte) ──
    { id:'UNT',        name:'Universidad Nacional de Trujillo',                                      abbr:'UNT',        aliases:['Trujillo'],                                            cat:'univ-pub',  city:'Trujillo',          dept:'La Libertad',    malla:'gen'  },
    { id:'UNPRG',      name:'Universidad Nacional Pedro Ruiz Gallo',                                 abbr:'UNPRG',      aliases:['Pedro Ruiz Gallo','Lambayeque'],                       cat:'univ-pub',  city:'Chiclayo',          dept:'Lambayeque',     malla:'gen'  },
    { id:'UNP',        name:'Universidad Nacional de Piura',                                         abbr:'UNP',        aliases:['Piura'],                                               cat:'univ-pub',  city:'Piura',             dept:'Piura',          malla:'gen'  },
    { id:'UNAT',       name:'Universidad Nacional de Tumbes',                                        abbr:'UNAT',       aliases:['Tumbes'],                                              cat:'univ-pub',  city:'Tumbes',            dept:'Tumbes',         malla:'gen'  },
    { id:'UNS',        name:'Universidad Nacional del Santa',                                        abbr:'UNS',        aliases:['Del Santa','Santa'],                                   cat:'univ-pub',  city:'Chimbote',          dept:'Áncash',         malla:'gen'  },
    // ── Universidades Públicas (Centro) ──
    { id:'UNCP',       name:'Universidad Nacional del Centro del Perú',                              abbr:'UNCP',       aliases:['Del Centro','Huancayo'],                               cat:'univ-pub',  city:'Huancayo',          dept:'Junín',          malla:'gen'  },
    { id:'UNDAC',      name:'Universidad Nacional Daniel Alcides Carrión',                           abbr:'UNDAC',      aliases:['Daniel Carrión','Pasco'],                              cat:'univ-pub',  city:'Cerro de Pasco',    dept:'Pasco',          malla:'gen'  },
    { id:'UNHEVAL',    name:'Universidad Nacional Hermilio Valdizán',                                abbr:'UNHEVAL',    aliases:['Hermilio Valdizán','Huánuco'],                         cat:'univ-pub',  city:'Huánuco',           dept:'Huánuco',        malla:'gen'  },
    { id:'UNH',        name:'Universidad Nacional de Huancavelica',                                  abbr:'UNH',        aliases:['Huancavelica'],                                        cat:'univ-pub',  city:'Huancavelica',      dept:'Huancavelica',   malla:'gen'  },
    { id:'UNAJMA',     name:'Universidad Nacional José María Arguedas',                              abbr:'UNAJMA',     aliases:['Arguedas','Andahuaylas'],                              cat:'univ-pub',  city:'Andahuaylas',       dept:'Apurímac',       malla:'gen'  },
    // ── Universidades Públicas (Sur) ──
    { id:'UNSA',       name:'Universidad Nacional de San Agustín de Arequipa',                       abbr:'UNSA',       aliases:['San Agustín','Arequipa'],                              cat:'univ-pub',  city:'Arequipa',          dept:'Arequipa',       malla:'gen'  },
    { id:'UNSAAC',     name:'Universidad Nacional San Antonio Abad del Cusco',                       abbr:'UNSAAC',     aliases:['San Antonio Abad','Cusco','Cusqueña'],                 cat:'univ-pub',  city:'Cusco',             dept:'Cusco',          malla:'gen'  },
    { id:'UNJBG',      name:'Universidad Nacional Jorge Basadre Grohmann',                           abbr:'UNJBG',      aliases:['Jorge Basadre','Tacna'],                               cat:'univ-pub',  city:'Tacna',             dept:'Tacna',          malla:'gen'  },
    { id:'UNAM',       name:'Universidad Nacional de Moquegua',                                      abbr:'UNAM',       aliases:['Moquegua'],                                            cat:'univ-pub',  city:'Moquegua',          dept:'Moquegua',       malla:'gen'  },
    { id:'UNSCH',      name:'Universidad Nacional de San Cristóbal de Huamanga',                     abbr:'UNSCH',      aliases:['Huamanga','Ayacucho'],                                 cat:'univ-pub',  city:'Ayacucho',          dept:'Ayacucho',       malla:'gen'  },
    { id:'UNAMBA',     name:'Universidad Nacional Micaela Bastidas de Apurímac',                     abbr:'UNAMBA',     aliases:['Micaela Bastidas','Apurímac'],                         cat:'univ-pub',  city:'Abancay',           dept:'Apurímac',       malla:'gen'  },
    // ── Universidades Públicas (Oriente) ──
    { id:'UNAP',       name:'Universidad Nacional de la Amazonía Peruana',                           abbr:'UNAP',       aliases:['Amazonía','Iquitos'],                                  cat:'univ-pub',  city:'Iquitos',           dept:'Loreto',         malla:'bio'  },
    { id:'UNAMAD',     name:'Universidad Nacional Amazónica de Madre de Dios',                       abbr:'UNAMAD',     aliases:['Madre de Dios'],                                       cat:'univ-pub',  city:'Puerto Maldonado',  dept:'Madre de Dios',  malla:'gen'  },
    // ── Universidades Privadas (Lima) ──
    { id:'PUCP',       name:'Pontificia Universidad Católica del Perú',                              abbr:'PUCP',       aliases:['Católica','La Católica','Pontifica'],                  cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'gen'  },
    { id:'ULima',      name:'Universidad de Lima',                                                   abbr:'ULima',      aliases:['Lima','U Lima'],                                       cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'eco'  },
    { id:'UP',         name:'Universidad del Pacífico',                                              abbr:'UP',         aliases:['Pacífico','Del Pacífico'],                             cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'eco'  },
    { id:'USMP',       name:'Universidad de San Martín de Porres',                                   abbr:'USMP',       aliases:['San Martín','San Martín de Porres'],                  cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'gen'  },
    { id:'UPC',        name:'Universidad Peruana de Ciencias Aplicadas',                             abbr:'UPC',        aliases:['Ciencias Aplicadas'],                                  cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'ing'  },
    { id:'UTP',        name:'Universidad Tecnológica del Perú',                                      abbr:'UTP',        aliases:['Tecnológica'],                                         cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'ing'  },
    { id:'UPCH',       name:'Universidad Peruana Cayetano Heredia',                                  abbr:'UPCH',       aliases:['Cayetano','Cayetano Heredia'],                         cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'bio'  },
    { id:'UCSUR',      name:'Universidad Científica del Sur',                                        abbr:'UCSUR',      aliases:['Científica del Sur','Científica'],                     cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'bio'  },
    { id:'USIL',       name:'Universidad San Ignacio de Loyola',                                     abbr:'USIL',       aliases:['San Ignacio','Loyola'],                                cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'eco'  },
    { id:'ESAN',       name:'Universidad ESAN',                                                      abbr:'ESAN',       aliases:['ESAN'],                                                cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'eco'  },
    { id:'UIGV',       name:'Universidad Inca Garcilaso de la Vega',                                 abbr:'UIGV',       aliases:['Inca Garcilaso','Garcilaso'],                          cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'gen'  },
    { id:'UAP',        name:'Universidad Alas Peruanas',                                             abbr:'UAP',        aliases:['Alas Peruanas','Alas'],                                cat:'univ-priv', city:'Lima',              dept:'Lima',           malla:'gen'  },
    // ── Universidades Privadas (Regiones) ──
    { id:'UCV',        name:'Universidad César Vallejo',                                             abbr:'UCV',        aliases:['César Vallejo','Vallejo'],                             cat:'univ-priv', city:'Trujillo',          dept:'La Libertad',    malla:'gen'  },
    { id:'UPAO',       name:'Universidad Privada Antenor Orrego',                                    abbr:'UPAO',       aliases:['Antenor Orrego','Orrego'],                             cat:'univ-priv', city:'Trujillo',          dept:'La Libertad',    malla:'gen'  },
    { id:'USS',        name:'Universidad Señor de Sipán',                                            abbr:'USS',        aliases:['Señor de Sipán','Sipán'],                              cat:'univ-priv', city:'Chiclayo',          dept:'Lambayeque',     malla:'gen'  },
    { id:'USAT',       name:'Universidad Católica Santo Toribio de Mogrovejo',                       abbr:'USAT',       aliases:['Santo Toribio','Mogrovejo'],                           cat:'univ-priv', city:'Chiclayo',          dept:'Lambayeque',     malla:'gen'  },
    { id:'Continental',name:'Universidad Continental',                                               abbr:'Continental',aliases:['Continental','Huancayo priv'],                         cat:'univ-priv', city:'Huancayo',          dept:'Junín',          malla:'gen'  },
    { id:'UCSM',       name:'Universidad Católica de Santa María',                                   abbr:'UCSM',       aliases:['Santa María','Católica Arequipa'],                     cat:'univ-priv', city:'Arequipa',          dept:'Arequipa',       malla:'gen'  },
    { id:'UCSP',       name:'Universidad Católica San Pablo',                                        abbr:'UCSP',       aliases:['San Pablo','Católica San Pablo'],                      cat:'univ-priv', city:'Arequipa',          dept:'Arequipa',       malla:'gen'  },
    { id:'ULADECH',    name:'Universidad Católica Los Ángeles de Chimbote',                          abbr:'ULADECH',    aliases:['Los Ángeles','Chimbote priv'],                         cat:'univ-priv', city:'Chimbote',          dept:'Áncash',         malla:'gen'  },
    { id:'UJCM',       name:'Universidad José Carlos Mariátegui',                                    abbr:'UJCM',       aliases:['José Carlos Mariátegui','Mariátegui'],                 cat:'univ-priv', city:'Moquegua',          dept:'Moquegua',       malla:'gen'  },
    // ── Institutos y Escuelas ──
    { id:'SENATI',          name:'Servicio Nacional de Adiestramiento en Trabajo Industrial',         abbr:'SENATI',          aliases:['SENATI'],                                        cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'TECSUP',          name:'TECSUP — Instituto Tecnológico',                                   abbr:'TECSUP',          aliases:['Tecsup'],                                        cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'SENCICO',         name:'Servicio Nacional de Capacitación para la Industria de la Construcción', abbr:'SENCICO',  aliases:['Sencico'],                                       cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'CIBERTEC',        name:'CIBERTEC — Instituto de Educación Superior',                       abbr:'CIBERTEC',        aliases:['Cibertec'],                                      cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'IDAT',            name:'Instituto de Administración y Tecnología',                         abbr:'IDAT',            aliases:['IDAT'],                                          cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'ToulouseLautrec', name:'Toulouse Lautrec — Escuela Superior de Arte y Diseño',             abbr:'Toulouse',        aliases:['Toulouse','Lautrec','Arte y Diseño'],            cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'CERTUS',          name:'Instituto CERTUS',                                                 abbr:'CERTUS',          aliases:['Certus'],                                        cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'ISIL',            name:'Instituto ISIL',                                                   abbr:'ISIL',            aliases:['ISIL'],                                          cat:'instituto', city:'Lima',              dept:'Lima',           malla:'tec'  },
    { id:'IPAE',            name:'IPAE Escuela de Empresarios',                                      abbr:'IPAE',            aliases:['IPAE'],                                          cat:'instituto', city:'Lima',              dept:'Lima',           malla:'eco'  },
    { id:'Khipu',           name:'Instituto Khipu',                                                  abbr:'Khipu',           aliases:['Khipu'],                                         cat:'instituto', city:'Cusco',             dept:'Cusco',          malla:'tec'  },
    // ── PNP ──
    { id:'EOPNP',           name:'Escuela de Oficiales de la Policía Nacional del Perú',             abbr:'EO PNP',          aliases:['Policía Nacional','PNP Oficiales','EO PNP'],     cat:'pnp',       city:'Lima',              dept:'Lima',           malla:'mil'  },
    { id:'ESUBOFPNP',       name:'Escuela de Suboficiales de la Policía Nacional del Perú',          abbr:'ESUBOFPNP',       aliases:['PNP Suboficiales','Suboficiales PNP'],           cat:'pnp',       city:'Lima',              dept:'Lima',           malla:'mil'  },
    // ── Ejército ──
    { id:'EMCH',            name:'Escuela Militar de Chorrillos',                                    abbr:'EMCH',            aliases:['Chorrillos','Militar Chorrillos','EMCH'],        cat:'ejercito',  city:'Lima',              dept:'Lima',           malla:'mil'  },
    { id:'EESE',            name:'Escuela de Suboficiales del Ejército del Perú',                    abbr:'EESE',            aliases:['Suboficiales Ejército','EESE'],                  cat:'ejercito',  city:'Lima',              dept:'Lima',           malla:'mil'  },
    // ── Marina ──
    { id:'ESNA',            name:'Escuela Naval del Perú',                                           abbr:'ESNA',            aliases:['La Naval','Naval','Escuela Naval'],               cat:'marina',    city:'Lima',              dept:'Lima',           malla:'mil'  },
    { id:'ESMGP',           name:'Escuela de Suboficiales de la Marina de Guerra del Perú',          abbr:'ESMGP',           aliases:['Suboficiales Marina','Marina Suboficiales'],     cat:'marina',    city:'Lima',              dept:'Lima',           malla:'mil'  },
    // ── FAP ──
    { id:'EOFAP',           name:'Escuela de Oficiales de la Fuerza Aérea del Perú',                 abbr:'EOFAP',           aliases:['FAP Oficiales','Fuerza Aérea Oficiales'],        cat:'fap',       city:'Lima',              dept:'Lima',           malla:'mil'  },
    { id:'ESFAP',           name:'Escuela de Suboficiales de la Fuerza Aérea del Perú',              abbr:'ESFAP',           aliases:['FAP Suboficiales','Fuerza Aérea Suboficiales'],  cat:'fap',       city:'Lima',              dept:'Lima',           malla:'mil'  },
    // ── Becas ──
    { id:'Beca18',          name:'Beca 18 — PRONABEC',                                               abbr:'Beca 18',         aliases:['Beca 18','PRONABEC','Pronabec'],                 cat:'beca',      city:'(Nacional)',        dept:'',               malla:'beca' },
  ];

  // Index for O(1) lookup
  const _idx = Object.create(null);
  DATA.forEach(e => { _idx[e.id] = e; });

  function _norm(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/  +/g, ' ').trim();
  }

  function _score(entry, q) {
    const nq   = _norm(q);
    const nid  = _norm(entry.id);
    const nabb = _norm(entry.abbr || '');
    const nnam = _norm(entry.name);

    if (nabb && nabb === nq)            return 100;
    if (nid  && nid  === nq)            return 100;
    if (nabb && nabb.startsWith(nq))    return 90;
    if (nid  && nid.startsWith(nq))     return 90;

    for (const a of (entry.aliases || [])) {
      const na = _norm(a);
      if (na === nq)                    return 85;
    }
    if (nnam.startsWith(nq))            return 80;
    for (const a of (entry.aliases || [])) {
      const na = _norm(a);
      if (na.startsWith(nq))            return 70;
    }
    if (nnam.includes(nq))              return 60;
    for (const a of (entry.aliases || [])) {
      const na = _norm(a);
      if (na.includes(nq))              return 50;
    }
    return 0;
  }

  function search(query, limit) {
    limit = limit == null ? 8 : limit;
    if (!query || !query.trim()) return [];
    const scored = [];
    for (let i = 0; i < DATA.length; i++) {
      const s = _score(DATA[i], query);
      if (s > 0) scored.push({ entry: DATA[i], s });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, limit).map(x => x.entry);
  }

  function getById(id) {
    return _idx[id] || null;
  }

  function getMalla(id) {
    const entry = _idx[id];
    if (!entry) return [];
    return MALLAS[entry.malla] || [];
  }

  function getCatMeta(cat) {
    return CATS[cat] || { label: cat, icon: '🎓', badge: cat, cls: '' };
  }

  const _RECENT_KEY = 'arv-inst-recent-v1';
  const _RECENT_MAX = 5;

  function getRecent() {
    try {
      return JSON.parse(localStorage.getItem(_RECENT_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRecent(id) {
    try {
      const list = getRecent().filter(x => x !== id);
      list.unshift(id);
      localStorage.setItem(_RECENT_KEY, JSON.stringify(list.slice(0, _RECENT_MAX)));
    } catch (e) { /* quota exceeded or private mode */ }
  }

  return { search, getById, getMalla, getCatMeta, getRecent, saveRecent };
})();
