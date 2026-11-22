/**
 * EXPORT.JS - Client-side Exporters: Excel (CSV/XLSX), Printable PDF Report, and JSON Backup
 */

class ExportService {
  /**
   * Genera ed avvia il download di un file CSV / Excel compatibile con tutti i dati ispezione
   */
  exportToExcel(inspections, bridges) {
    if (!inspections || inspections.length === 0) {
      alert('Nessuna ispezione da esportare.');
      return;
    }

    const bridgeMap = new Map();
    (bridges || []).forEach(b => bridgeMap.set(b.id, b));

    const headers = [
      'ID Ispezione',
      'Codice Opera',
      'Nome Opera',
      'Strada / Tratta',
      'Progressiva KM',
      'Data Ispezione',
      'Ispettore',
      'Componente Ispezionato',
      'G (Gravita)',
      'K1 (Influenza)',
      'K2 (Ambiente)',
      'Indice Difetto (Id)',
      'Classe Attenzione',
      'Azione Prescritta',
      'GPS Latitudine',
      'GPS Longitudine',
      'Foto Allegate',
      'Note Peritali'
    ];

    const rows = inspections.map(insp => {
      const b = bridgeMap.get(insp.bridgeId) || { code: 'N/D', name: 'N/D', route: 'N/D', km: 'N/D' };
      const m = insp.matrix || { G: 1, K1: 1, K2: 1, score: 1, className: 'Bassa', action: '' };
      const gps = insp.gps || {};

      return [
        insp.id,
        b.code,
        `"${(b.name || '').replace(/"/g, '""')}"`,
        `"${(b.route || '').replace(/"/g, '""')}"`,
        b.km || '',
        new Date(insp.date).toLocaleDateString('it-IT') + ' ' + new Date(insp.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        `"${(insp.inspector || '').replace(/"/g, '""')}"`,
        `"${(insp.component || 'Impalcato').replace(/"/g, '""')}"`,
        m.G,
        m.K1,
        m.K2,
        m.score,
        `"${m.className}"`,
        `"${(m.action || '').replace(/"/g, '""')}"`,
        gps.lat || '',
        gps.lng || '',
        insp.photosCount || (insp.photos ? insp.photos.length : 0),
        `"${(insp.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `Storico_Ispezioni_Ponti_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  /**
   * Genera e visualizza la finestra di stampa / PDF per una specifica ispezione
   */
  async printInspectionReport(inspection, bridge, photos = []) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Abilita i popup nel browser per visualizzare il report stampabile.');
      return;
    }

    const m = inspection.matrix || { G: 1, K1: 1, K2: 1, score: 1, className: 'Bassa', action: 'N/D' };
    const dateFormatted = new Date(inspection.date).toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let photosHtml = '';
    if (photos && photos.length > 0) {
      photosHtml = `
        <div style="margin-top: 25px;">
          <h3 style="border-bottom: 2px solid #0284c7; padding-bottom: 5px; color: #0f172a; font-size: 16px;">DOCUMENTAZIONE FOTOGRAFICA ALLEGATA (${photos.length})</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
            ${photos.map((p, idx) => `
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; page-break-inside: avoid; background: #f8fafc;">
                <img src="${p.dataUrl}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px;" alt="Foto Rilievo ${idx + 1}" />
                <div style="font-size: 11px; margin-top: 4px; color: #475569; font-weight: 600;">
                  Foto #${idx + 1} - ${p.component || inspection.component || 'Componente'} ${p.timestamp ? '(' + new Date(p.timestamp).toLocaleTimeString('it-IT') + ')' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Scheda Ispezione - ${bridge.code} - ${bridge.name}</title>
        <style>
          body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; padding: 25px; line-height: 1.5; font-size: 13px; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #0284c7; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          .data-table th { background: #f1f5f9; font-weight: 700; color: #334155; width: 35%; }
          .score-card { background: #f8fafc; border: 2px solid ${m.color || '#0284c7'}; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .score-num { font-size: 32px; font-weight: 900; color: ${m.color || '#0284c7'}; float: right; }
          .footer-sign { display: flex; justify-content: space-between; margin-top: 40px; page-break-inside: avoid; }
          .sign-box { border-top: 1px solid #000; width: 220px; text-align: center; padding-top: 5px; font-size: 11px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">🖨️ Stampa / Salva come PDF</button>
        </div>

        <div class="header-box">
          <div>
            <div class="title">SCHEDA DI RILIEVO E ISPEZIONE SPEDITIVA PONTI</div>
            <div class="subtitle">Linee Guida per la classificazione del rischio e la sicurezza dei ponti esistenti</div>
          </div>
          <div style="text-align: right;">
            <strong style="font-size: 16px; color: #0f172a;">${bridge.code}</strong><br>
            <span style="color: #64748b;">${new Date().toLocaleDateString('it-IT')}</span>
          </div>
        </div>

        <div class="grid-2">
          <div>
            <h4 style="margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">DATI OPERA D'ARTE</h4>
            <table class="data-table">
              <tr><th>Nome Opera</th><td><strong>${bridge.name}</strong></td></tr>
              <tr><th>Codice Univoco</th><td>${bridge.code}</td></tr>
              <tr><th>Strada / Tratta</th><td>${bridge.route || 'N/D'} (km ${bridge.km || 'N/D'})</td></tr>
              <tr><th>Tipologia</th><td>${bridge.structureType || 'Travi CA / CAP'}</td></tr>
              <tr><th>Campate / Lungh.</th><td>${bridge.spans || 1} campate (${bridge.lengthMeters || 'N/D'} m)</td></tr>
              <tr><th>Coordinate GPS</th><td>${bridge.gpsLat ? bridge.gpsLat.toFixed(6) + ', ' + bridge.gpsLng.toFixed(6) : 'N/D'}</td></tr>
            </table>
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">DATI ISPEZIONE</h4>
            <table class="data-table">
              <tr><th>Data & Ora</th><td>${dateFormatted}</td></tr>
              <tr><th>Ispettore / Perito</th><td>${inspection.inspector || 'Operatore Qualificato'}</td></tr>
              <tr><th>Componente</th><td><strong>${inspection.component || 'Impalcato Principale'}</strong></td></tr>
              <tr><th>Stato Ispezione</th><td>Completata / Validata</td></tr>
              <tr><th>Rif. Normativo</th><td>D.M. 578/2020 - Livello 1</td></tr>
              <tr><th>ID Univoco Rilievo</th><td><code>${inspection.id}</code></td></tr>
            </table>
          </div>
        </div>

        <div class="score-card">
          <div class="score-num">${m.score}</div>
          <div style="font-size: 16px; font-weight: 800; color: ${m.color || '#0284c7'}; margin-bottom: 4px;">
            ESITO MATRICE: ${m.className.toUpperCase()}
          </div>
          <div style="font-size: 12px; color: #334155; margin-bottom: 8px;">
            Formula di calcolo: <strong>G (${m.G}) × K1 (${m.K1}) × K2 (${m.K2}) = ${m.score}</strong>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #0f172a;">
            Azione Prescritta: <span style="font-weight: 400;">${m.action || 'Manutenzione periodica'}</span>
          </div>
        </div>

        <div>
          <h4 style="margin: 0 0 8px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">NOTE TECNICHE & OSSERVAZIONI DELL'ISPETTORE</h4>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; min-height: 60px;">
            ${inspection.notes ? inspection.notes.replace(/\n/g, '<br>') : 'Nessuna nota peritale registrata.'}
          </div>
        </div>

        ${photosHtml}

        <div class="footer-sign">
          <div class="sign-box">
            Firma Tecnico Rilevatore<br><br>
            <strong>${inspection.inspector || 'L\'Ispettore'}</strong>
          </div>
          <div class="sign-box">
            Visto Responsabile Ufficio Ponti<br><br>
            _______________________________
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }
}

// Global Singleton Instance
window.exportService = new ExportService();
