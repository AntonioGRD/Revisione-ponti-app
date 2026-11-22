/**
 * SAMPLE-DATA.JS - Inizializzazione Database Pulito (Nessun dato dimostrativo/fittizio)
 */

const SAMPLE_BRIDGES = [];
const SAMPLE_INSPECTIONS = [];

async function initSampleDataIfEmpty() {
  // Purga eventuali record di esempio residui
  try {
    if (window.db && window.db.purgeSampleData) {
      await window.db.purgeSampleData();
    }
  } catch (e) {
    console.warn('[DB Init] Pulizia campioni:', e);
  }
}
