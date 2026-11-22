/**
 * PHOTO.JS - Client-side Canvas Image Compression & Watermark Overlay Engine
 */

class PhotoProcessor {
  constructor(options = {}) {
    this.maxWidth = options.maxWidth || 1920;
    this.maxHeight = options.maxHeight || 1080;
    this.quality = options.quality || 0.82; // 82% standard high quality
    this.format = options.format || 'image/jpeg';
  }

  /**
   * Comprime un'immagine da File o Blob utilizzando Canvas API e opzionalmente sovrappone il Watermark
   * @param {File|Blob} file - File immagine originale
   * @param {Object} watermarkInfo - Dati per la filigrana (bridgeCode, bridgeName, gps, component, inspector, date)
   * @returns {Promise<Object>} Oggetto con base64, blob, originalSize, compressedSize, compressionRatio
   */
  async processAndCompress(file, watermarkInfo = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const originalSize = file.size;

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Calcolo dimensioni mantenendo le proporzioni
            let { width, height } = img;
            if (width > this.maxWidth || height > this.maxHeight) {
              if (width / height > this.maxWidth / this.maxHeight) {
                height = Math.round((height * this.maxWidth) / width);
                width = this.maxWidth;
              } else {
                width = Math.round((width * this.maxHeight) / height);
                height = this.maxHeight;
              }
            }

            // Creazione Canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Render dell'immagine scalata
            ctx.drawImage(img, 0, 0, width, height);

            // Applicazione Watermark Peritale se richiesto
            if (watermarkInfo) {
              this.applyWatermark(ctx, width, height, watermarkInfo);
            }

            // Esportazione compressa in JPEG o WebP
            const dataUrl = canvas.toDataURL(this.format, this.quality);

            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Impossibile generare Blob dal Canvas'));
                return;
              }

              const compressedSize = blob.size;
              const ratio = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

              resolve({
                dataUrl,
                blob,
                width,
                height,
                originalSize,
                compressedSize,
                compressionRatio: `${ratio}%`,
                originalSizeFormatted: this.formatBytes(originalSize),
                compressedSizeFormatted: this.formatBytes(compressedSize),
                timestamp: new Date().toISOString()
              });
            }, this.format, this.quality);

          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Errore di caricamento immagine'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Errore di lettura file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Disegna un banner watermark semi-trasparente ad alta leggibilità in basso a sinistra
   */
  applyWatermark(ctx, width, height, info) {
    const fontSize = Math.max(14, Math.round(width * 0.016));
    const padding = Math.round(fontSize * 0.8);
    const lineHeight = Math.round(fontSize * 1.35);

    const now = info.date ? new Date(info.date) : new Date();
    const dateStr = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const lines = [
      `OPERA: ${info.bridgeCode || 'N/D'} - ${info.bridgeName || 'Viadotto'}`,
      `COMPONENTE: ${info.component || 'Generale'} | ISPETTORE: ${info.inspector || 'Operatore'}`,
      `DATA/ORA: ${dateStr}`
    ];

    if (info.gps && (info.gps.lat || info.gps.latitude)) {
      const lat = (info.gps.lat || info.gps.latitude).toFixed(6);
      const lng = (info.gps.lng || info.gps.longitude).toFixed(6);
      const acc = info.gps.accuracy ? ` (±${Math.round(info.gps.accuracy)}m)` : '';
      lines.push(`GPS: ${lat}, ${lng}${acc}`);
    }

    ctx.font = `600 ${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;

    // Calcolo larghezza massima del testo
    let maxTextWidth = 0;
    lines.forEach(line => {
      const textMetrics = ctx.measureText(line);
      if (textMetrics.width > maxTextWidth) maxTextWidth = textMetrics.width;
    });

    const boxWidth = maxTextWidth + (padding * 2);
    const boxHeight = (lines.length * lineHeight) + (padding * 1.5);
    const boxX = padding;
    const boxY = height - boxHeight - padding;

    // Sfondo scuro semi-trasparente
    ctx.save();
    ctx.fillStyle = 'rgba(11, 15, 25, 0.78)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    
    // Rettangolo arrotondato per il badge
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8, true, true);

    // Testo con shadow per massima leggibilità
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    lines.forEach((line, index) => {
      const textY = boxY + padding + (index * lineHeight) + (fontSize * 0.75);
      // Prima riga evidenziata in azzurro
      if (index === 0) {
        ctx.fillStyle = '#38bdf8';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(line, boxX + padding, textY);
    });

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Global Singleton Instance
window.photoProcessor = new PhotoProcessor();
