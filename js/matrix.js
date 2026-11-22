/**
 * MATRIX.JS - Calculation Engine for Bridge Defect Matrix (G x K1 x K2) & Lookup Tables
 */

const MATRIX_CONFIG = {
  // Componenti strutturali tipici
  components: [
    { id: 'impalcato', name: 'Travi di Impalcato / Soletta', defaultK1: 4, desc: 'Elemento portante principale dell\'impalcato' },
    { id: 'pile', name: 'Pile e Pulvini', defaultK1: 4, desc: 'Sostegni verticali intermedi e mensole' },
    { id: 'spalle', name: 'Spalle e Muri d\'ala', defaultK1: 3, desc: 'Sostegni di estremità e ritenuta terre' },
    { id: 'appoggi', name: 'Apparecchi d\'Appoggio', defaultK1: 4, desc: 'Dispositivi elastomerici, multidirezionali o in acciaio' },
    { id: 'giunti', name: 'Giunti di Dilatazione', defaultK1: 2, desc: 'Elementi di transizione e tenuta all\'acqua' },
    { id: 'barriere', name: 'Barriere di Sicurezza & Cordoli', defaultK1: 3, desc: 'Sistemi di ritenuta veicolare H2/H3/H4' },
    { id: 'fondazioni', name: 'Fondazioni e Alveo', defaultK1: 5, desc: 'Plinti, pali, scalzamento e dinamica fluviale' },
    { id: 'sovrastruttura', name: 'Pavimentazione e Impermeabilizzazione', defaultK1: 2, desc: 'Manto d\'usura e smaltimento acque' }
  ],

  // Definizioni G (Gravità / Estensione del degrado)
  G_DEFINITIONS: [
    { value: 1, label: 'G1 - Lieve / Trascurabile', desc: 'Degrado superficiale iniziale, assenza di lesioni strutturali' },
    { value: 2, label: 'G2 - Minore', desc: 'Difetti localizzati, fessurazioni millimetriche o ossidazione superficiale' },
    { value: 3, label: 'G3 - Medio / Diffuso', desc: 'Distacco copriferro, armature a vista, lesioni passanti moderate' },
    { value: 4, label: 'G4 - Grave', desc: 'Corrosione severa armature, deformazioni visibili o delaminazioni estese' },
    { value: 5, label: 'G5 - Molto Grave / Critico', desc: 'Rottura di trefoli/barre, dissesto statico, fessure evolutive' }
  ],

  // Definizioni K1 (Fattore di Rilevanza / Influenza Statica)
  K1_DEFINITIONS: [
    { value: 1, label: 'K1=1 - Secondario', desc: 'Elemento non portante o accessorio privo di impatto statico' },
    { value: 2, label: 'K1=2 - Moderato', desc: 'Elemento con ridotta ridondanza strutturale o barriera secondaria' },
    { value: 3, label: 'K1=3 - Importante', desc: 'Elemento funzionale essenziale o contenimento principale' },
    { value: 4, label: 'K1=4 - Primario Portante', desc: 'Travi maestre, pile, apparecchi di appoggio' },
    { value: 5, label: 'K1=5 - Fondamentale / No Ridondanza', desc: 'Pali di fondazione con scalzamento, nodi isostatici critici' }
  ],

  // Definizioni K2 (Fattore di Accelerazione / Ambiente / Aggressività)
  K2_DEFINITIONS: [
    { value: 1, label: 'K2=1 - Bassa Aggressività', desc: 'Ambiente asciutto/rurale, traffico leggero, assenza di sali disgelanti' },
    { value: 2, label: 'K2=2 - Media Aggressività', desc: 'Ambiente sub-urbano, umidità ordinaria, traffico misto' },
    { value: 3, label: 'K2=3 - Alta Aggressività', desc: 'Ambiente marino / costiero o impiego frequente di sali disgelanti' },
    { value: 4, label: 'K2=4 - Molto Alta / Severa', desc: 'Ambiente industriale/marino severo + carichi eccezionali e vibrazioni' }
  ],

  // Classi di Attenzione / Rischio in base al punteggio Id = G * K1 * K2
  THRESHOLDS: [
    {
      max: 15,
      classKey: 'low',
      className: 'Classe Bassa',
      badgeClass: 'badge-low',
      severityClass: 'severity-low',
      color: '#10b981',
      action: 'Manutenzione Ordinaria Programmata',
      monitoring: 'Rilievo periodico standard (frequenza 2 anni)'
    },
    {
      max: 35,
      classKey: 'med',
      className: 'Classe Media',
      badgeClass: 'badge-med',
      severityClass: 'severity-med',
      color: '#eab308',
      action: 'Monitoraggio Approfondito e Manutenzione Mirata',
      monitoring: 'Verifica semestrale e risanamento localizzato copriferro/giunti'
    },
    {
      max: 65,
      classKey: 'high',
      className: 'Classe Alta',
      badgeClass: 'badge-high',
      severityClass: 'severity-high',
      color: '#f97316',
      action: 'Ispezione Speciale di Livello 2 & Valutazione Sicurezza',
      monitoring: 'Indagini diagnostiche distruttive/non distruttive (CND) entro 60 giorni'
    },
    {
      max: 999,
      classKey: 'crit',
      className: 'Classe Molto Alta / Critica',
      badgeClass: 'badge-crit',
      severityClass: 'severity-crit',
      color: '#ef4444',
      action: 'Provvedimenti Immediati di Tutela & Intervento Urgente',
      monitoring: 'Limitazione immediata traffico/carichi e messa in sicurezza provvisionale'
    }
  ]
};

class MatrixEngine {
  constructor(customConfig = null) {
    this.config = customConfig || MATRIX_CONFIG;
  }

  /**
   * Calcola l'indice di difettosità e la classe di attenzione
   * @param {number} G - Gravità (1-5)
   * @param {number} K1 - Influenza statica (1-5)
   * @param {number} K2 - Accelerazione ambiente (1-4)
   * @returns {Object} Risultato calcolato con indice, classe, colore, prescrizione
   */
  calculate(G, K1, K2) {
    const gVal = Math.max(1, Math.min(5, parseInt(G, 10) || 1));
    const k1Val = Math.max(1, Math.min(5, parseInt(K1, 10) || 1));
    const k2Val = Math.max(1, Math.min(4, parseInt(K2, 10) || 1));

    // Formula Indice di Difetto: Id = G * K1 * K2
    const score = gVal * k1Val * k2Val;

    // Ricerca nella lookup table delle soglie
    let resultThreshold = this.config.THRESHOLDS[this.config.THRESHOLDS.length - 1];
    for (const t of this.config.THRESHOLDS) {
      if (score <= t.max) {
        resultThreshold = t;
        break;
      }
    }

    return {
      G: gVal,
      K1: k1Val,
      K2: k2Val,
      score: score,
      classKey: resultThreshold.classKey,
      className: resultThreshold.className,
      badgeClass: resultThreshold.badgeClass,
      severityClass: resultThreshold.severityClass,
      color: resultThreshold.color,
      action: resultThreshold.action,
      monitoring: resultThreshold.monitoring,
      formulaDisplay: `${gVal} × ${k1Val} × ${k2Val} = ${score}`
    };
  }

  /**
   * Genera la matrice di lookup tridimensionale proiettata (tabelle G x K1 per ogni valore K2)
   */
  generateLookupTableMatrix(k2Selected = 2) {
    const matrixRows = [];
    for (let g = 1; g <= 5; g++) {
      const row = { gValue: g, cols: [] };
      for (let k1 = 1; k1 <= 5; k1++) {
        const calc = this.calculate(g, k1, k2Selected);
        row.cols.push(calc);
      }
      matrixRows.push(row);
    }
    return matrixRows;
  }

  getComponentById(id) {
    return this.config.components.find(c => c.id === id) || this.config.components[0];
  }
}

// Global Singleton Instance
window.matrixEngine = new MatrixEngine();
