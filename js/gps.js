/**
 * GPS.JS - Geolocation Service & Position Helper for Bridge Inspections
 */

class GPSService {
  constructor() {
    this.currentPosition = null;
    this.watchId = null;
    this.isWatching = false;
  }

  /**
   * Ottiene la posizione corrente del dispositivo con alta precisione
   * @param {Object} options - { timeout, maximumAge, enableHighAccuracy }
   * @returns {Promise<Object>} { lat, lng, accuracy, altitude, heading, speed, timestamp }
   */
  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocalizzazione non supportata da questo browser o dispositivo.'));
        return;
      }

      const geoOptions = {
        enableHighAccuracy: options.enableHighAccuracy !== undefined ? options.enableHighAccuracy : true,
        timeout: options.timeout || 12000,
        maximumAge: options.maximumAge || 0
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp
          };
          this.currentPosition = coords;
          resolve(coords);
        },
        (error) => {
          let msg = 'Impossibile rilevare la posizione GPS.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Permesso di localizzazione negato dall\'utente.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Segnale GPS non disponibile o assente.';
              break;
            case error.TIMEOUT:
              msg = 'Timeout nel rilevamento della posizione GPS.';
              break;
          }
          reject(new Error(msg));
        },
        geoOptions
      );
    });
  }

  /**
   * Avvia il monitoraggio continuo della posizione (live tracking su mappa)
   */
  startWatching(callback, errorCallback) {
    if (!('geolocation' in navigator)) return null;
    if (this.isWatching) this.stopWatching();

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          timestamp: pos.timestamp
        };
        this.currentPosition = coords;
        if (callback) callback(coords);
      },
      (err) => {
        if (errorCallback) errorCallback(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    this.isWatching = true;
    return this.watchId;
  }

  stopWatching() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * Calcola la distanza in metri tra due coordinate geografiche (formula di Haversine)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Raggio terrestre in metri
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distanza in metri
  }

  formatCoords(lat, lng) {
    if (!lat || !lng) return 'N/D';
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  }
}

// Global Singleton Instance
window.gpsService = new GPSService();
