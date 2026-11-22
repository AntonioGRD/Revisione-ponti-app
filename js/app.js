/**
 * APP.JS - Main Application Controller for Ponti & Viadotti PWA (Offline-First)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ==================== STATE ====================
  const state = {
    bridges: [],
    currentInspectionPhotos: [], // Array of { id, dataUrl, blob, component, timestamp, ... }
    activeTab: 'tab-bridges',
    activeBridgeForInspection: null,
    isOnline: navigator.onLine
  };

  // ==================== DOM ELEMENTS ====================
  const elements = {
    // Navigation
    desktopNavTabs: document.querySelectorAll('#desktopNavTabs .nav-tab-btn'),
    mobileNavItems: document.querySelectorAll('#mobileBottomNav .bottom-nav-item'),
    tabViews: document.querySelectorAll('.tab-view'),
    brandHomeBtn: document.getElementById('brandHomeBtn'),

    // Network & Theme
    networkStatusPill: document.getElementById('networkStatusPill'),
    networkStatusText: document.getElementById('networkStatusText'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),

    // Bridges View
    bridgesContainer: document.getElementById('bridgesContainer'),
    bridgeSearchInput: document.getElementById('bridgeSearchInput'),
    bridgeRiskFilter: document.getElementById('bridgeRiskFilter'),
    openNewBridgeModalBtn: document.getElementById('openNewBridgeModalBtn'),

    // New Bridge Modal
    newBridgeModal: document.getElementById('newBridgeModal'),
    closeNewBridgeModalBtn: document.getElementById('closeNewBridgeModalBtn'),
    cancelNewBridgeBtn: document.getElementById('cancelNewBridgeBtn'),
    newBridgeForm: document.getElementById('newBridgeForm'),
    captureGPSBtn: document.getElementById('captureGPSBtn'),
    newBridgeLat: document.getElementById('newBridgeLat'),
    newBridgeLng: document.getElementById('newBridgeLng'),
    gpsAccuracyDisplay: document.getElementById('gpsAccuracyDisplay'),

    // Inspection Form & Matrix
    inspBridgeSelect: document.getElementById('inspBridgeSelect'),
    inspComponentSelect: document.getElementById('inspComponentSelect'),
    inspDateInput: document.getElementById('inspDateInput'),
    inspInspectorInput: document.getElementById('inspInspectorInput'),
    inspNotesInput: document.getElementById('inspNotesInput'),
    draftAutoSaveStatus: document.getElementById('draftAutoSaveStatus'),
    gSlider: document.getElementById('gSlider'),
    k1Slider: document.getElementById('k1Slider'),
    k2Slider: document.getElementById('k2Slider'),
    gValDisplay: document.getElementById('gValDisplay'),
    k1ValDisplay: document.getElementById('k1ValDisplay'),
    k2ValDisplay: document.getElementById('k2ValDisplay'),
    gDescDisplay: document.getElementById('gDescDisplay'),
    k1DescDisplay: document.getElementById('k1DescDisplay'),
    k2DescDisplay: document.getElementById('k2DescDisplay'),
    matrixScoreBanner: document.getElementById('matrixScoreBanner'),
    scoreFormulaDisplay: document.getElementById('scoreFormulaDisplay'),
    scoreClassTitle: document.getElementById('scoreClassTitle'),
    scoreBadge: document.getElementById('scoreBadge'),
    scorePrescription: document.getElementById('scorePrescription'),
    scoreNumberDisplay: document.getElementById('scoreNumberDisplay'),

    // Photos
    photoFileInput: document.getElementById('photoFileInput'),
    photoDropArea: document.getElementById('photoDropArea'),
    photoGalleryContainer: document.getElementById('photoGalleryContainer'),
    photoCompressingIndicator: document.getElementById('photoCompressingIndicator'),

    // Form Actions
    resetInspFormBtn: document.getElementById('resetInspFormBtn'),
    saveDraftBtn: document.getElementById('saveDraftBtn'),
    saveInspectionBtn: document.getElementById('saveInspectionBtn'),

    // History View
    historyBridgeFilter: document.getElementById('historyBridgeFilter'),
    historyTimelineContainer: document.getElementById('historyTimelineContainer'),
    exportAllExcelBtn: document.getElementById('exportAllExcelBtn'),

    // Cloud & Sync View
    triggerSyncAllBtn: document.getElementById('triggerSyncAllBtn'),
    syncQueueContainer: document.getElementById('syncQueueContainer'),
    syncQueueCountBadge: document.getElementById('syncQueueCountBadge'),
    syncPendingBadge: document.getElementById('syncPendingBadge'),
    syncProgressBarWrapper: document.getElementById('syncProgressBarWrapper'),
    syncProgressBar: document.getElementById('syncProgressBar'),
    syncProgressText: document.getElementById('syncProgressText'),
    syncProgressPercent: document.getElementById('syncProgressPercent'),
    oneDriveLoginBtn: document.getElementById('oneDriveLoginBtn'),
    openAzureConfigBtn: document.getElementById('openAzureConfigBtn'),

    // Modals: Lookup Table, Settings, Lightbox
    viewLookupMatrixBtn: document.getElementById('viewLookupMatrixBtn'),
    lookupMatrixModal: document.getElementById('lookupMatrixModal'),
    closeLookupMatrixModalBtn: document.getElementById('closeLookupMatrixModalBtn'),
    closeLookupMatrixBtn2: document.getElementById('closeLookupMatrixBtn2'),
    interactiveLookupTable: document.getElementById('interactiveLookupTable'),
    k2LookupBtns: document.querySelectorAll('.k2-lookup-btn'),

    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    azureClientIdInput: document.getElementById('azureClientIdInput'),
    azureTenantIdInput: document.getElementById('azureTenantIdInput'),
    saveAzureSettingsBtn: document.getElementById('saveAzureSettingsBtn'),
    exportFullDbBtn: document.getElementById('exportFullDbBtn'),
    importFullDbFileInput: document.getElementById('importFullDbFileInput'),
    wipeAllDataBtn: document.getElementById('wipeAllDataBtn'),

    photoLightboxModal: document.getElementById('photoLightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxPhotoCaption: document.getElementById('lightboxPhotoCaption'),
    closeLightboxModalBtn: document.getElementById('closeLightboxModalBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // ==================== INITIALIZATION ====================
  await initServiceWorker();
  await window.db.initPromise;
  await initSampleDataIfEmpty();
  setupEventListeners();
  setupOnlineOfflineListeners();
  loadInitialTheme();
  setDefaultDateTime();
  await loadBridges();
  await loadHistory();
  await updateSyncQueueUI();
  updateMatrixCalculation();
  renderLookupTable(2);

  // Check OAuth callback from Azure AD
  await window.oneDriveService.handleAuthCallback();

  // ==================== NAVIGATION LOGIC ====================
  function switchTab(tabId) {
    state.activeTab = tabId;
    elements.tabViews.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(tabId);
    if (targetView) targetView.classList.add('active');

    // Update desktop tabs
    elements.desktopNavTabs.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update mobile nav
    elements.mobileNavItems.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    if (tabId === 'tab-history') loadHistory();
    if (tabId === 'tab-sync') updateSyncQueueUI();
    if (tabId === 'tab-bridges') loadBridges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== SERVICE WORKER PWA ====================
  async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        console.log('[PWA] Service Worker registrato con successo:', reg.scope);
      } catch (err) {
        console.warn('[PWA] Registrazione Service Worker fallita:', err);
      }
    }
  }

  // ==================== ONLINE / OFFLINE LOGIC ====================
  function setupOnlineOfflineListeners() {
    function updateNetworkStatus() {
      state.isOnline = navigator.onLine;
      if (state.isOnline) {
        elements.networkStatusPill.className = 'online-pill is-online';
        elements.networkStatusText.textContent = 'ONLINE';
        showToast('Connessione ripristinata. Sincronizzazione disponibile.', 'success');
        // Auto trigger sync if there are pending items
        processSyncQueueSilently();
      } else {
        elements.networkStatusPill.className = 'online-pill is-offline';
        elements.networkStatusText.textContent = 'OFFLINE (Locale)';
        showToast('Modalità Offline attiva. I dati saranno salvati localmente in IndexedDB.', 'warning');
      }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
  }

  // ==================== THEME MANAGEMENT ====================
  function loadInitialTheme() {
    const savedTheme = localStorage.getItem('ponti_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ponti_theme', next);
    updateThemeIcons(next);
  }

  function updateThemeIcons(theme) {
    if (theme === 'dark') {
      elements.themeIconSun.style.display = 'none';
      elements.themeIconMoon.style.display = 'inline-block';
    } else {
      elements.themeIconSun.style.display = 'inline-block';
      elements.themeIconMoon.style.display = 'none';
    }
  }

  // ==================== BRIDGES MANAGEMENT ====================
  async function loadBridges() {
    state.bridges = await window.db.getAllBridges();
    renderBridgesList();
    populateBridgeDropdowns();
  }

  function renderBridgesList() {
    const query = (elements.bridgeSearchInput.value || '').toLowerCase().trim();
    const riskFilter = elements.bridgeRiskFilter.value;

    const filtered = state.bridges.filter(b => {
      const matchText = (b.name || '').toLowerCase().includes(query) ||
                        (b.code || '').toLowerCase().includes(query) ||
                        (b.route || '').toLowerCase().includes(query) ||
                        (b.km || '').toLowerCase().includes(query);
      const matchRisk = riskFilter === 'all' || b.riskClass === riskFilter;
      return matchText && matchRisk;
    });

    if (filtered.length === 0) {
      elements.bridgesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted); background: var(--bg-surface); border-radius: var(--radius-lg); border: 2px dashed var(--border-color);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" stroke-width="1.5" style="margin-bottom: 0.75rem;"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v7M12 14v7M16 14v7"/></svg>
          <h3 style="color: var(--text-primary); margin-bottom: 0.35rem;">Nessun viadotto censito</h3>
          <p style="font-size: 0.85rem; max-width: 420px; margin: 0 auto 1.25rem auto;">Il database è vuoto. Clicca su "+ Nuovo Viadotto" per registrare la prima opera d'arte con relative coordinate GPS.</p>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('openNewBridgeModalBtn').click()">
            + Registra Primo Viadotto
          </button>
        </div>
      `;
      return;
    }

    elements.bridgesContainer.innerHTML = filtered.map(b => {
      const riskClassKey = b.riskClass || 'low';
      let badgeHtml = '<span class="badge badge-low">Classe Bassa</span>';
      if (riskClassKey === 'med') badgeHtml = '<span class="badge badge-med">Classe Media</span>';
      if (riskClassKey === 'high') badgeHtml = '<span class="badge badge-high">Classe Alta</span>';
      if (riskClassKey === 'crit') badgeHtml = '<span class="badge badge-crit">Critica / Urgente</span>';

      const lastDate = b.lastInspectionDate
        ? new Date(b.lastInspectionDate).toLocaleDateString('it-IT')
        : 'Mai ispezionato';

      return `
        <div class="card bridge-card risk-${riskClassKey}">
          <div>
            <div class="bridge-card-top">
              <span class="bridge-code">${b.code}</span>
              ${badgeHtml}
            </div>
            <h3 class="bridge-title">${b.name}</h3>
            <div class="bridge-route">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
              ${b.route || 'Tratta non definita'} ${b.km ? '(' + b.km + ')' : ''}
            </div>

            <div class="bridge-metrics">
              <div class="metric-item">
                <span class="metric-label">Campate</span>
                <span class="metric-value">${b.spans || 1}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Lunghezza</span>
                <span class="metric-value">${b.lengthMeters ? b.lengthMeters + 'm' : 'N/D'}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Rilievi</span>
                <span class="metric-value">${b.inspectionCount || 0}</span>
              </div>
            </div>

            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              Ultimo Rilievo: <strong>${lastDate}</strong>
            </div>
          </div>

          <div class="bridge-card-actions">
            <button class="btn btn-primary btn-sm start-insp-btn" data-id="${b.id}" style="flex: 1;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Nuovo Rilievo
            </button>
            <button class="btn btn-secondary btn-sm view-history-btn" data-id="${b.id}" title="Vedi Storico Ispezioni">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    document.querySelectorAll('.start-insp-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        startInspectionForBridge(id);
      });
    });

    document.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        elements.historyBridgeFilter.value = id;
        switchTab('tab-history');
      });
    });
  }

  function populateBridgeDropdowns() {
    if (!state.bridges || state.bridges.length === 0) {
      elements.inspBridgeSelect.innerHTML = '<option value="">-- Nessun viadotto censito --</option>';
      elements.historyBridgeFilter.innerHTML = '<option value="all">Tutti i Viadotti (Nessuno presente)</option>';
      return;
    }
    const options = state.bridges.map(b => `<option value="${b.id}">${b.code} - ${b.name}</option>`).join('');
    elements.inspBridgeSelect.innerHTML = options;
    elements.historyBridgeFilter.innerHTML = '<option value="all">Tutti i Viadotti</option>' + options;
  }

  function startInspectionForBridge(bridgeId) {
    elements.inspBridgeSelect.value = bridgeId;
    setDefaultDateTime();
    switchTab('tab-inspection');
  }

  // ==================== NEW BRIDGE CREATION ====================
  elements.openNewBridgeModalBtn.addEventListener('click', () => {
    elements.newBridgeForm.reset();
    elements.gpsAccuracyDisplay.textContent = 'Accuratezza GPS: Non ancora rilevata';
    elements.newBridgeModal.classList.add('active');
  });

  elements.closeNewBridgeModalBtn.addEventListener('click', () => elements.newBridgeModal.classList.remove('active'));
  elements.cancelNewBridgeBtn.addEventListener('click', () => elements.newBridgeModal.classList.remove('active'));

  elements.captureGPSBtn.addEventListener('click', async () => {
    elements.captureGPSBtn.textContent = '🛰️ Rilevamento in corso...';
    try {
      const pos = await window.gpsService.getCurrentPosition();
      elements.newBridgeLat.value = pos.lat.toFixed(6);
      elements.newBridgeLng.value = pos.lng.toFixed(6);
      elements.gpsAccuracyDisplay.textContent = `Coordinate rilevate con successo (Precisione: ±${Math.round(pos.accuracy)}m)`;
      elements.gpsAccuracyDisplay.style.color = '#34d399';
      showToast('Posizione GPS acquisita con successo!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
      elements.gpsAccuracyDisplay.textContent = `Errore GPS: ${err.message}`;
      elements.gpsAccuracyDisplay.style.color = '#f87171';
    } finally {
      elements.captureGPSBtn.textContent = '🛰️ Rileva Posizione GPS Attuale';
    }
  });

  elements.newBridgeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newBridge = {
      id: 'bridge_' + Date.now(),
      code: document.getElementById('newBridgeCode').value.trim().toUpperCase(),
      name: document.getElementById('newBridgeName').value.trim(),
      route: document.getElementById('newBridgeRoute').value.trim(),
      km: document.getElementById('newBridgeKm').value.trim(),
      structureType: document.getElementById('newBridgeType').value,
      spans: parseInt(document.getElementById('newBridgeSpans').value, 10) || 1,
      lengthMeters: parseFloat(document.getElementById('newBridgeLength').value) || null,
      builtYear: parseInt(document.getElementById('newBridgeYear').value, 10) || null,
      gpsLat: parseFloat(elements.newBridgeLat.value) || null,
      gpsLng: parseFloat(elements.newBridgeLng.value) || null,
      riskClass: 'low',
      inspectionCount: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await window.db.saveBridge(newBridge);
      elements.newBridgeModal.classList.remove('active');
      showToast(`Viadotto ${newBridge.code} censito con successo!`, 'success');
      await loadBridges();
    } catch (err) {
      showToast('Errore nel salvataggio del viadotto: ' + err.message, 'error');
    }
  });

  // ==================== MATRIX ENGINE & SLIDERS ====================
  function updateMatrixCalculation() {
    const G = parseInt(elements.gSlider.value, 10);
    const K1 = parseInt(elements.k1Slider.value, 10);
    const K2 = parseInt(elements.k2Slider.value, 10);

    // Update value displays
    elements.gValDisplay.textContent = `G${G}`;
    elements.k1ValDisplay.textContent = `K1=${K1}`;
    elements.k2ValDisplay.textContent = `K2=${K2}`;

    // Update descriptions
    const gDef = MATRIX_CONFIG.G_DEFINITIONS.find(d => d.value === G);
    const k1Def = MATRIX_CONFIG.K1_DEFINITIONS.find(d => d.value === K1);
    const k2Def = MATRIX_CONFIG.K2_DEFINITIONS.find(d => d.value === K2);

    if (gDef) elements.gDescDisplay.textContent = gDef.desc;
    if (k1Def) elements.k1DescDisplay.textContent = k1Def.desc;
    if (k2Def) elements.k2DescDisplay.textContent = k2Def.desc;

    // Calculate score
    const result = window.matrixEngine.calculate(G, K1, K2);

    // Update Result Banner
    elements.matrixScoreBanner.className = `matrix-score-banner ${result.severityClass}`;
    elements.scoreFormulaDisplay.textContent = `Calcolo: G (${result.G}) × K1 (${result.K1}) × K2 (${result.K2}) = ${result.score}`;
    elements.scoreNumberDisplay.textContent = result.score;
    elements.scoreNumberDisplay.style.color = result.color;

    elements.scoreBadge.className = `badge ${result.badgeClass}`;
    elements.scoreBadge.textContent = result.className.toUpperCase();
    elements.scoreClassTitle.querySelector('span:last-child').textContent = result.action.split('&')[0];
    elements.scorePrescription.textContent = `Prescrizione: ${result.action}. ${result.monitoring}.`;

    autoSaveDraft();
    return result;
  }

  [elements.gSlider, elements.k1Slider, elements.k2Slider].forEach(slider => {
    slider.addEventListener('input', updateMatrixCalculation);
  });

  elements.inspComponentSelect.addEventListener('change', () => {
    // Suggerisce K1 predefinito per il componente selezionato
    const compName = elements.inspComponentSelect.value;
    const comp = MATRIX_CONFIG.components.find(c => c.name === compName);
    if (comp) {
      elements.k1Slider.value = comp.defaultK1;
      updateMatrixCalculation();
    }
  });

  // ==================== LOOKUP TABLE MODAL ====================
  elements.viewLookupMatrixBtn.addEventListener('click', () => {
    elements.lookupMatrixModal.classList.add('active');
  });

  elements.closeLookupMatrixModalBtn.addEventListener('click', () => elements.lookupMatrixModal.classList.remove('active'));
  elements.closeLookupMatrixBtn2.addEventListener('click', () => elements.lookupMatrixModal.classList.remove('active'));

  elements.k2LookupBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elements.k2LookupBtns.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const k2 = parseInt(e.currentTarget.getAttribute('data-k2'), 10);
      renderLookupTable(k2);
    });
  });

  function renderLookupTable(k2 = 2) {
    const matrix = window.matrixEngine.generateLookupTableMatrix(k2);
    let tableHtml = `
      <thead>
        <tr style="background: var(--bg-surface-elevated); border-bottom: 2px solid var(--border-color);">
          <th style="padding: 10px; border: 1px solid var(--border-color);">Gravità (G) \\ Influenza (K1)</th>
          <th style="padding: 10px; border: 1px solid var(--border-color);">K1 = 1</th>
          <th style="padding: 10px; border: 1px solid var(--border-color);">K1 = 2</th>
          <th style="padding: 10px; border: 1px solid var(--border-color);">K1 = 3</th>
          <th style="padding: 10px; border: 1px solid var(--border-color);">K1 = 4</th>
          <th style="padding: 10px; border: 1px solid var(--border-color);">K1 = 5</th>
        </tr>
      </thead>
      <tbody>
    `;

    matrix.forEach(row => {
      tableHtml += `<tr>`;
      tableHtml += `<td style="padding: 8px; font-weight: bold; background: var(--bg-surface-elevated); border: 1px solid var(--border-color);">G${row.gValue}</td>`;
      row.cols.forEach(col => {
        tableHtml += `
          <td style="padding: 8px; border: 1px solid var(--border-color); background: ${col.color}22; color: ${col.color}; font-weight: bold; font-family: var(--font-mono);">
            ${col.score}<br><span style="font-size: 0.65rem; font-weight: normal;">${col.className.replace('Classe ', '')}</span>
          </td>
        `;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody>`;
    elements.interactiveLookupTable.innerHTML = tableHtml;
  }

  // ==================== PHOTO PROCESSING & CANVAS COMPRESSOR ====================
  elements.photoDropArea.addEventListener('click', () => elements.photoFileInput.click());

  elements.photoFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    elements.photoCompressingIndicator.style.display = 'block';

    const bridgeId = elements.inspBridgeSelect.value;
    const currentBridge = state.bridges.find(b => b.id === bridgeId) || { code: 'OPERA', name: 'Ponte' };
    const component = elements.inspComponentSelect.value;
    const inspector = elements.inspInspectorInput.value;

    let gps = null;
    try {
      gps = await window.gpsService.getCurrentPosition({ timeout: 4000 }).catch(() => null);
    } catch { /* ignore */ }

    const watermarkInfo = {
      bridgeCode: currentBridge.code,
      bridgeName: currentBridge.name,
      component: component,
      inspector: inspector,
      date: elements.inspDateInput.value,
      gps: gps || (currentBridge.gpsLat ? { lat: currentBridge.gpsLat, lng: currentBridge.gpsLng } : null)
    };

    for (const file of files) {
      try {
        const processed = await window.photoProcessor.processAndCompress(file, watermarkInfo);
        const photoItem = {
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          dataUrl: processed.dataUrl,
          blob: processed.blob,
          originalSizeFormatted: processed.originalSizeFormatted,
          compressedSizeFormatted: processed.compressedSizeFormatted,
          compressionRatio: processed.compressionRatio,
          component: component,
          timestamp: new Date().toISOString()
        };

        state.currentInspectionPhotos.push(photoItem);
        showToast(`Foto compressa: ${processed.originalSizeFormatted} → ${processed.compressedSizeFormatted} (-${processed.compressionRatio})`, 'success');
      } catch (err) {
        showToast('Errore compressione foto: ' + err.message, 'error');
      }
    }

    elements.photoCompressingIndicator.style.display = 'none';
    elements.photoFileInput.value = '';
    renderPhotoGallery();
    autoSaveDraft();
  });

  function renderPhotoGallery() {
    if (state.currentInspectionPhotos.length === 0) {
      elements.photoGalleryContainer.innerHTML = '';
      return;
    }

    elements.photoGalleryContainer.innerHTML = state.currentInspectionPhotos.map((photo, idx) => `
      <div class="photo-thumb-card">
        <img src="${photo.dataUrl}" alt="Foto ${idx + 1}" class="lightbox-trigger" data-idx="${idx}">
        <button type="button" class="photo-thumb-delete" data-idx="${idx}" title="Rimuovi foto">&times;</button>
        <div class="photo-thumb-meta">
          <span>#${idx + 1} ${photo.compressedSizeFormatted}</span>
          <span style="color: #34d399;">-${photo.compressionRatio}</span>
        </div>
      </div>
    `).join('');

    // Attach thumbnail click handlers
    document.querySelectorAll('.lightbox-trigger').forEach(img => {
      img.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        openLightbox(state.currentInspectionPhotos[idx]);
      });
    });

    document.querySelectorAll('.photo-thumb-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        state.currentInspectionPhotos.splice(idx, 1);
        renderPhotoGallery();
        autoSaveDraft();
      });
    });
  }

  function openLightbox(photo) {
    elements.lightboxImg.src = photo.dataUrl;
    elements.lightboxPhotoCaption.textContent = `${photo.component || 'Rilievo'} • Compressa: ${photo.compressedSizeFormatted} (-${photo.compressionRatio})`;
    elements.photoLightboxModal.classList.add('active');
  }

  elements.closeLightboxModalBtn.addEventListener('click', () => elements.photoLightboxModal.classList.remove('active'));
  elements.photoLightboxModal.addEventListener('click', (e) => {
    if (e.target === elements.photoLightboxModal) elements.photoLightboxModal.classList.remove('active');
  });

  // ==================== AUTO-SAVE DRAFT ====================
  async function autoSaveDraft() {
    const draft = {
      bridgeId: elements.inspBridgeSelect.value,
      component: elements.inspComponentSelect.value,
      date: elements.inspDateInput.value,
      inspector: elements.inspInspectorInput.value,
      notes: elements.inspNotesInput.value,
      G: elements.gSlider.value,
      K1: elements.k1Slider.value,
      K2: elements.k2Slider.value,
      photos: state.currentInspectionPhotos
    };
    await window.db.saveDraft(draft);
    elements.draftAutoSaveStatus.textContent = 'Bozza salvata ' + new Date().toLocaleTimeString('it-IT');
  }

  elements.inspNotesInput.addEventListener('input', autoSaveDraft);
  elements.inspInspectorInput.addEventListener('input', autoSaveDraft);

  // ==================== SAVE INSPECTION ====================
  elements.saveInspectionBtn.addEventListener('click', async () => {
    const bridgeId = elements.inspBridgeSelect.value;
    if (!bridgeId) {
      showToast('Seleziona un viadotto prima di salvare.', 'error');
      return;
    }

    const bridge = state.bridges.find(b => b.id === bridgeId);
    const matrixResult = window.matrixEngine.calculate(
      elements.gSlider.value,
      elements.k1Slider.value,
      elements.k2Slider.value
    );

    let gps = null;
    try {
      gps = await window.gpsService.getCurrentPosition({ timeout: 3000 }).catch(() => null);
    } catch { /* ignore */ }

    const inspection = {
      id: 'insp_' + Date.now(),
      bridgeId: bridgeId,
      date: elements.inspDateInput.value || new Date().toISOString(),
      inspector: elements.inspInspectorInput.value.trim() || 'Ispettore Tecnico',
      component: elements.inspComponentSelect.value,
      matrix: matrixResult,
      notes: elements.inspNotesInput.value.trim(),
      gps: gps || (bridge && bridge.gpsLat ? { lat: bridge.gpsLat, lng: bridge.gpsLng } : null),
      photosCount: state.currentInspectionPhotos.length,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save Inspection to IndexedDB
      await window.db.saveInspection(inspection);

      // 2. Save Photos to IndexedDB
      for (const photo of state.currentInspectionPhotos) {
        photo.inspectionId = inspection.id;
        photo.bridgeId = bridgeId;
        await window.db.savePhoto(photo);
      }

      // 3. Update Bridge Risk Class and Last Inspection Date
      if (bridge) {
        bridge.riskClass = matrixResult.classKey;
        bridge.lastInspectionDate = inspection.date;
        bridge.inspectionCount = (bridge.inspectionCount || 0) + 1;
        await window.db.saveBridge(bridge);
      }

      // 4. Add task to OneDrive Sync Queue
      await window.db.addToSyncQueue({
        inspectionId: inspection.id,
        bridgeId: bridgeId,
        type: 'ONEDRIVE_UPLOAD',
        status: 'pending',
        bridgeCode: bridge ? bridge.code : 'OPERA',
        date: inspection.date
      });

      // 5. Clear Draft
      await window.db.clearDraft();
      state.currentInspectionPhotos = [];
      renderPhotoGallery();
      elements.inspNotesInput.value = '';

      showToast('Ispezione salvata in IndexedDB e accodata per la sincronizzazione!', 'success');
      await loadBridges();
      await updateSyncQueueUI();
      switchTab('tab-history');

      // Auto trigger sync if online
      if (state.isOnline) {
        processSyncQueueSilently();
      }

    } catch (err) {
      showToast('Errore salvataggio ispezione: ' + err.message, 'error');
    }
  });

  elements.resetInspFormBtn.addEventListener('click', async () => {
    if (confirm('Sei sicuro di voler azzerare tutti i campi della scheda corrente?')) {
      await window.db.clearDraft();
      state.currentInspectionPhotos = [];
      renderPhotoGallery();
      elements.inspNotesInput.value = '';
      elements.gSlider.value = 1;
      elements.k1Slider.value = 4;
      elements.k2Slider.value = 2;
      updateMatrixCalculation();
      setDefaultDateTime();
      showToast('Scheda azzerata.', 'info');
    }
  });

  // ==================== HISTORY VIEW ====================
  async function loadHistory() {
    const inspections = await window.db.getAllInspections();
    const filterBridgeId = elements.historyBridgeFilter.value;

    const filtered = (filterBridgeId === 'all')
      ? inspections
      : inspections.filter(i => i.bridgeId === filterBridgeId);

    if (filtered.length === 0) {
      elements.historyTimelineContainer.innerHTML = `
        <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          Nessuna ispezione registrata per il filtro selezionato.
        </div>
      `;
      return;
    }

    const bridgeMap = new Map();
    state.bridges.forEach(b => bridgeMap.set(b.id, b));

    let html = '';
    for (const insp of filtered) {
      const b = bridgeMap.get(insp.bridgeId) || { code: 'N/D', name: 'Viadotto' };
      const m = insp.matrix || { G: 1, K1: 1, K2: 1, score: 1, className: 'Bassa', badgeClass: 'badge-low', color: '#10b981' };
      const dateFormatted = new Date(insp.date).toLocaleDateString('it-IT', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // Load photos for this inspection from DB
      const photos = await window.db.getPhotosByInspection(insp.id);

      let photosThumbHtml = '';
      if (photos.length > 0) {
        photosThumbHtml = `
          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; overflow-x: auto; padding-bottom: 4px;">
            ${photos.map((p, pIdx) => `
              <img src="${p.dataUrl}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color); cursor: pointer;"
                   onclick="window.appOpenLightbox('${p.dataUrl}', '${b.code} - ${insp.component || 'Rilievo'}')" alt="Foto ${pIdx + 1}">
            `).join('')}
          </div>
        `;
      }

      html += `
        <div class="timeline-item">
          <div class="timeline-dot" style="background: ${m.color || '#38bdf8'};"></div>
          <div class="timeline-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div>
                <span class="bridge-code">${b.code}</span>
                <strong style="margin-left: 0.4rem;">${b.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem;">
                  ${dateFormatted} • Ispettore: ${insp.inspector || 'N/D'}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge ${m.badgeClass}">${m.className} (Id=${m.score})</span>
              </div>
            </div>

            <div style="font-size: 0.825rem; margin: 0.4rem 0;">
              <strong>Componente:</strong> ${insp.component || 'Impalcato'} | 
              <strong>Formula:</strong> G(${m.G}) × K1(${m.K1}) × K2(${m.K2}) = <strong style="color: ${m.color || 'inherit'};">${m.score}</strong>
            </div>

            ${insp.notes ? `<div style="font-size: 0.8rem; background: var(--bg-surface-elevated); padding: 0.5rem 0.75rem; border-radius: 6px; border-left: 3px solid ${m.color || '#0284c7'}; margin-top: 0.4rem;">${insp.notes}</div>` : ''}

            ${photosThumbHtml}

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
              <button class="btn btn-outline btn-sm print-report-btn" data-id="${insp.id}">
                📄 Stampa / Salva PDF
              </button>
            </div>
          </div>
        </div>
      `;
    }

    elements.historyTimelineContainer.innerHTML = html;

    // Attach print listeners
    document.querySelectorAll('.print-report-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const inspection = (await window.db.getAllInspections()).find(i => i.id === id);
        if (inspection) {
          const b = (await window.db.getAllBridges()).find(bridge => bridge.id === inspection.bridgeId);
          const photos = await window.db.getPhotosByInspection(inspection.id);
          window.exportService.printInspectionReport(inspection, b || { code: 'OPERA', name: 'Ponte' }, photos);
        }
      });
    });
  }

  // Global helper for lightbox from inline HTML
  window.appOpenLightbox = (dataUrl, caption) => {
    elements.lightboxImg.src = dataUrl;
    elements.lightboxPhotoCaption.textContent = caption;
    elements.photoLightboxModal.classList.add('active');
  };

  elements.historyBridgeFilter.addEventListener('change', loadHistory);

  elements.exportAllExcelBtn.addEventListener('click', async () => {
    const inspections = await window.db.getAllInspections();
    const bridges = await window.db.getAllBridges();
    window.exportService.exportToExcel(inspections, bridges);
  });

  // ==================== CLOUD & ONEDRIVE SYNC ====================
  async function updateSyncQueueUI() {
    const queue = await window.db.getSyncQueue();
    const pendingCount = queue.filter(q => q.status === 'pending').length;

    elements.syncQueueCountBadge.textContent = `${pendingCount} in sospeso`;
    if (pendingCount > 0) {
      elements.syncPendingBadge.style.display = 'inline-block';
      elements.syncPendingBadge.textContent = pendingCount;
    } else {
      elements.syncPendingBadge.style.display = 'none';
    }

    if (queue.length === 0) {
      elements.syncQueueContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
          Nessun elemento in coda di sincronizzazione. Tutti i rilievi sono sincronizzati.
        </div>
      `;
      return;
    }

    elements.syncQueueContainer.innerHTML = queue.map(item => {
      let iconClass = 'pending';
      let iconText = '⏳';
      let statusLabel = 'In attesa di caricamento';

      if (item.status === 'syncing') {
        iconClass = 'syncing';
        iconText = '⚙️';
        statusLabel = 'Sincronizzazione in corso...';
      } else if (item.status === 'done') {
        iconClass = 'done';
        iconText = '✅';
        statusLabel = 'Sincronizzato su OneDrive';
      } else if (item.status === 'error') {
        iconClass = 'error';
        iconText = '❌';
        statusLabel = 'Errore durante upload';
      }

      const dateStr = item.date ? new Date(item.date).toLocaleDateString('it-IT') : '';

      return `
        <div class="sync-item-row">
          <div class="sync-item-info">
            <div class="sync-status-icon ${iconClass}">${iconText}</div>
            <div>
              <strong style="font-size: 0.85rem;">${item.bridgeCode || 'OPERA'} - Rilievo del ${dateStr}</strong>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${statusLabel}</div>
            </div>
          </div>
          <div>
            ${item.status === 'pending' || item.status === 'error' ? `
              <button class="btn btn-outline btn-sm sync-single-btn" data-id="${item.id}">Sincronizza</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.sync-single-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        syncSingleQueueItem(id);
      });
    });
  }

  async function syncSingleQueueItem(queueId) {
    const queue = await window.db.getSyncQueue();
    const item = queue.find(q => q.id === queueId);
    if (!item) return;

    elements.syncProgressBarWrapper.style.display = 'block';

    item.status = 'syncing';
    await window.db.updateSyncItem(item);
    await updateSyncQueueUI();

    try {
      const inspection = (await window.db.getAllInspections()).find(i => i.id === item.inspectionId);
      const bridge = (await window.db.getAllBridges()).find(b => b.id === item.bridgeId);
      const photos = await window.db.getPhotosByInspection(item.inspectionId);

      await window.oneDriveService.syncInspectionToOneDrive(
        inspection,
        bridge || { code: item.bridgeCode || 'OPERA' },
        photos,
        (msg, pct) => {
          elements.syncProgressText.textContent = msg;
          elements.syncProgressPercent.textContent = `${pct}%`;
          elements.syncProgressBar.style.width = `${pct}%`;
        }
      );

      item.status = 'done';
      await window.db.updateSyncItem(item);
      showToast(`Sincronizzazione completata per ${item.bridgeCode}!`, 'success');

    } catch (err) {
      item.status = 'error';
      item.lastError = err.message;
      await window.db.updateSyncItem(item);
      showToast('Errore sincronizzazione: ' + err.message, 'error');
    } finally {
      setTimeout(() => {
        elements.syncProgressBarWrapper.style.display = 'none';
      }, 1500);
      await updateSyncQueueUI();
    }
  }

  async function processSyncQueueSilently() {
    const queue = await window.db.getSyncQueue();
    const pending = queue.filter(q => q.status === 'pending');
    for (const item of pending) {
      await syncSingleQueueItem(item.id);
    }
  }

  elements.triggerSyncAllBtn.addEventListener('click', async () => {
    showToast('Avvio sincronizzazione massiva su OneDrive...', 'info');
    await processSyncQueueSilently();
  });

  // ==================== AZURE SETTINGS & ONEDRIVE MODAL ====================
  elements.openAzureConfigBtn.addEventListener('click', () => {
    elements.azureClientIdInput.value = window.oneDriveService.clientId || '';
    elements.azureTenantIdInput.value = window.oneDriveService.tenantId || 'common';
    elements.settingsModal.classList.add('active');
  });

  elements.settingsBtn.addEventListener('click', () => {
    elements.azureClientIdInput.value = window.oneDriveService.clientId || '';
    elements.azureTenantIdInput.value = window.oneDriveService.tenantId || 'common';
    elements.settingsModal.classList.add('active');
  });

  elements.closeSettingsModalBtn.addEventListener('click', () => elements.settingsModal.classList.remove('active'));

  elements.saveAzureSettingsBtn.addEventListener('click', () => {
    window.oneDriveService.setConfig(
      elements.azureClientIdInput.value,
      elements.azureTenantIdInput.value
    );
    showToast('Parametri Azure AD salvati.', 'success');
  });

  elements.oneDriveLoginBtn.addEventListener('click', async () => {
    try {
      await window.oneDriveService.login();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Full DB Export / Import
  elements.exportFullDbBtn.addEventListener('click', async () => {
    const backupObj = await window.db.exportFullDatabase();
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    window.exportService.triggerDownload(blob, `Backup_Database_Ponti_${new Date().toISOString().slice(0, 10)}.json`);
    showToast('Backup completo scaricato con successo.', 'success');
  });

  elements.importFullDbFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importedObj = JSON.parse(text);
      await window.db.importFullDatabase(importedObj);
      showToast('Database ripristinato con successo!', 'success');
      elements.settingsModal.classList.remove('active');
      await loadBridges();
      await loadHistory();
    } catch (err) {
      showToast('Errore durante importazione: ' + err.message, 'error');
    }
  });

  if (elements.wipeAllDataBtn) {
    elements.wipeAllDataBtn.addEventListener('click', async () => {
      if (confirm('Sei sicuro di voler eliminare TUTTI i viadotti, le ispezioni e le foto dal database locale?')) {
        await window.db.clearAllData();
        elements.settingsModal.classList.remove('active');
        showToast('Database locale svuotato completamente.', 'warning');
        await loadBridges();
        await loadHistory();
        await updateSyncQueueUI();
      }
    });
  }

  // ==================== EVENT LISTENERS SETUP ====================
  function setupEventListeners() {
    // Navigation tabs
    elements.desktopNavTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    elements.mobileNavItems.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    elements.brandHomeBtn.addEventListener('click', () => switchTab('tab-bridges'));
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Search and filter in bridges
    elements.bridgeSearchInput.addEventListener('input', renderBridgesList);
    elements.bridgeRiskFilter.addEventListener('change', renderBridgesList);
  }

  function setDefaultDateTime() {
    const now = new Date();
    // Format to YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    elements.inspDateInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
  }

  // ==================== TOAST NOTIFICATIONS ====================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});
