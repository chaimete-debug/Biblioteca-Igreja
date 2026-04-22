// ─────────────────────────────────────────────────────────────
//  scanner.js — Leitor de QR e código de barras
//  Biblioteca: ZXing via unpkg CDN
// ─────────────────────────────────────────────────────────────

const Scanner = {
  _reader : null,
  _onResult: null,

  // Abre o scanner. onResult(codigoLido) é chamado ao detectar.
  open(onResult) {
    this._onResult = onResult;
    _scannerEnsureModal();
    document.getElementById('modal-scanner').classList.add('open');
    document.getElementById('scan-status').textContent = 'A carregar câmara...';
    document.getElementById('scan-code').textContent   = '';
    this._start();
  },

  close() {
    this._stop();
    const m = document.getElementById('modal-scanner');
    if (m) m.classList.remove('open');
  },

  async _start() {
    // Load ZXing once
    if (!window.ZXing) {
      try {
        await _loadScript('https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js');
      } catch(e) {
        document.getElementById('scan-status').textContent = '❌ Erro ao carregar biblioteca de leitura.';
        return;
      }
    }

    try {
      const hints = new Map([
        [ZXing.DecodeHintType.POSSIBLE_FORMATS, [
          ZXing.BarcodeFormat.EAN_13,
          ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.CODE_128,
          ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.QR_CODE,
          ZXing.BarcodeFormat.UPC_A,
          ZXing.BarcodeFormat.UPC_E,
          ZXing.BarcodeFormat.ITF,
        ]],
        [ZXing.DecodeHintType.TRY_HARDER, true],
      ]);

      this._reader = new ZXing.BrowserMultiFormatReader(hints);

      document.getElementById('scan-status').textContent = 'Aponte a câmara para o código';

      await this._reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        'scan-video',
        (result, err) => {
          if (!result) return;
          const code = result.getText();
          document.getElementById('scan-code').textContent   = code;
          document.getElementById('scan-status').textContent = '✅ Código detectado!';
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          setTimeout(() => {
            this.close();
            if (this._onResult) this._onResult(code);
          }, 700);
        }
      );
    } catch(err) {
      const msg = err.name === 'NotAllowedError'
        ? '❌ Permissão de câmara negada. Active nas definições do browser.'
        : err.name === 'NotFoundError'
        ? '❌ Nenhuma câmara encontrada neste dispositivo.'
        : '❌ ' + (err.message || err);
      document.getElementById('scan-status').textContent = msg;
    }
  },

  _stop() {
    if (this._reader) {
      try { this._reader.reset(); } catch(e) {}
      this._reader = null;
    }
  },
};

// ── Helpers ──────────────────────────────────────────────────
function _loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function _scannerEnsureModal() {
  if (document.getElementById('modal-scanner')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="modal-scanner">
      <div class="modal-backdrop" onclick="Scanner.close()"></div>
      <div class="modal-box" style="max-width:400px">
        <div class="modal-header">
          <h3>📷 Leitor de código</h3>
          <button class="modal-close" onclick="Scanner.close()">×</button>
        </div>
        <div class="modal-body" style="padding:1rem">

          <div style="position:relative; background:#000; border-radius:var(--radius); overflow:hidden">
            <video id="scan-video" autoplay muted playsinline
              style="width:100%; display:block; max-height:260px; object-fit:cover"></video>
            <!-- Aiming frame -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              width:70%;max-width:220px;height:100px;border:2px solid var(--gold);border-radius:8px;
              box-shadow:0 0 0 2000px rgba(0,0,0,.35); pointer-events:none">
              <!-- Scanning line -->
              <div style="position:absolute;left:0;right:0;height:2px;background:var(--gold);
                opacity:.8;animation:scanline 1.6s ease-in-out infinite"></div>
            </div>
          </div>

          <style>
            @keyframes scanline {
              0%,100% { top:5%; } 50% { top:90%; }
            }
          </style>

          <div style="margin-top:.85rem; text-align:center">
            <div id="scan-status" style="font-size:.85rem;color:var(--ink-3);margin-bottom:.4rem">
              A iniciar...
            </div>
            <div id="scan-code" style="font-family:var(--font-mono);font-size:1rem;
              font-weight:500;color:var(--ink);min-height:1.4em;letter-spacing:.05em"></div>
          </div>

          <p style="font-size:.72rem;color:var(--ink-3);text-align:center;margin-top:.75rem">
            Suporta ISBN-13 · EAN · QR Code · Code 128 · UPC
          </p>
        </div>
      </div>
    </div>`);
}
