import { networkInterfaces } from 'os';
import QRCode from 'qrcode';

const sessions = new Map();
let _tunnelUrl = null;
let _publicIp = null;

export function setTunnelUrl(url) { _tunnelUrl = url; }
export function setPublicIp(ip) { _publicIp = ip; }

function getLanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

function getBaseUrl(port) {
  if (_tunnelUrl) return _tunnelUrl;
  return `http://${getLanIP()}:${port}`;
}

export async function createSession(req, res) {
  try {
    const id = Math.random().toString(36).slice(2, 12);
    sessions.set(id, { created: Date.now(), image: null });
    setTimeout(() => sessions.delete(id), 10 * 60 * 1000);
    const port = process.env.PORT || 3000;
    const mobileUrl = `${getBaseUrl(port)}/m/${id}`;
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
    res.json({ id, mobileUrl, qrDataUrl, publicIp: _publicIp });
  } catch (e) {
    console.error('createSession erreur:', e.message);
    res.status(500).json({ error: e.message });
  }
}

export function uploadScan(req, res) {
  const { id } = req.params;
  if (!sessions.has(id)) return res.status(404).json({ error: 'Session expirée' });
  sessions.get(id).image = req.body.image;
  res.json({ ok: true });
}

export function pollScan(req, res) {
  const { id } = req.params;
  const session = sessions.get(id);
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  if (session.image) {
    const image = session.image;
    sessions.delete(id);
    return res.json({ ready: true, image });
  }
  res.json({ ready: false });
}

export function mobilePage(req, res) {
  const { id } = req.params;
  const port = process.env.PORT || 3000;
  const apiBase = getBaseUrl(port);
  const valid = sessions.has(id);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!valid) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CardScout</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#070f1f;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;text-align:center;padding:24px}</style></head><body><div><div style="font-size:48px;margin-bottom:16px">⏱️</div><div style="font-size:20px;font-weight:700;margin-bottom:8px">Session expirée</div><div style="font-size:13px;opacity:.5">Retourne sur CardScout et réessaie.</div></div></body></html>`);
  }

  const page = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>CardScout — Grading IA</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--cyan:#38bdf8;--purple:#a78bfa;--gold:#f59e0b;--dark:#020b18;--card:#081525}
body{background:var(--dark);background-image:linear-gradient(rgba(56,189,248,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.025) 1px,transparent 1px);background-size:44px 44px;min-height:100vh;font-family:'DM Sans',sans-serif;color:#fff;padding-bottom:80px;overflow-x:hidden}
/* ── Topbar ── */
.topbar{padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(56,189,248,.1);background:rgba(2,11,24,.92);backdrop-filter:blur(16px);position:sticky;top:0;z-index:20}
.logo{font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:700;letter-spacing:-.01em}
.logo em{background:linear-gradient(90deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-style:normal}
.badge{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:var(--cyan);background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);padding:4px 10px;border-radius:999px;letter-spacing:.06em}
.badge-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:blink 1.5s infinite}
@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.4)}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Layout ── */
.wrap{padding:22px 16px 0;max-width:460px;margin:0 auto}
.lbl{font-size:9px;font-weight:700;color:var(--cyan);letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.lbl::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(56,189,248,.25),transparent)}

/* ── Hero ── */
.hero{margin-bottom:24px}
.hero-title{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:700;line-height:1.15;background:linear-gradient(135deg,#fff 30%,rgba(56,189,248,.8));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px}
.hero-sub{font-size:12px;color:rgba(255,255,255,.35);line-height:1.6}
.hero-sub b{color:rgba(56,189,248,.7);font-weight:500}

/* ── Photos ── */
.photos-section{margin-bottom:22px}
.photos-grid{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:11px;min-height:0}
.thumb{position:relative;width:calc(33.33% - 7px);aspect-ratio:.72;border-radius:16px;overflow:hidden;background:var(--card);border:1.5px solid rgba(56,189,248,.25);flex-shrink:0;transition:border-color .2s}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.thumb-del{position:absolute;top:6px;right:6px;background:rgba(2,11,24,.75);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);line-height:1}
.thumb-num{position:absolute;bottom:6px;left:7px;font-size:10px;font-weight:700;color:var(--cyan);font-family:'Space Grotesk',sans-serif;text-shadow:0 0 8px rgba(56,189,248,.6)}
.thumb-corner{position:absolute;inset:0;pointer-events:none}
.thumb-corner::before,.thumb-corner::after{content:'';position:absolute;width:12px;height:12px;border-color:var(--cyan);border-style:solid;opacity:.5}
.thumb-corner::before{top:6px;left:6px;border-width:1.5px 0 0 1.5px;border-radius:3px 0 0 0}
.thumb-corner::after{bottom:6px;right:6px;border-width:0 1.5px 1.5px 0;border-radius:0 0 3px 0}
.btn-add{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:14px;background:rgba(56,189,248,.04);border:1.5px dashed rgba(56,189,248,.2);border-radius:16px;color:rgba(56,189,248,.65);font-size:13px;font-weight:600;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all .2s;letter-spacing:.02em}
.btn-add:active{background:rgba(56,189,248,.09);border-color:var(--cyan);color:var(--cyan)}
.btn-add-icon{width:28px;height:28px;border-radius:50%;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.25);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:400;color:var(--cyan)}
.photo-count{font-size:11px;color:rgba(56,189,248,.4);text-align:right;margin-top:7px;font-weight:500}

/* ── Textarea ── */
.context-section{margin-bottom:20px}
.tx{width:100%;background:rgba(8,21,37,.7);border:1px solid rgba(56,189,248,.15);border-radius:16px;padding:13px 15px;font-size:13px;color:#e2e8f0;font-family:'DM Sans',sans-serif;resize:none;outline:none;line-height:1.65;transition:border-color .25s,box-shadow .25s}
.tx:focus{border-color:rgba(56,189,248,.45);box-shadow:0 0 0 3px rgba(56,189,248,.06),inset 0 0 0 1px rgba(56,189,248,.08)}
.tx::placeholder{color:rgba(255,255,255,.18)}
.context-hint{margin-top:8px;font-size:11px;color:rgba(56,189,248,.45);display:flex;align-items:flex-start;gap:5px;line-height:1.55}

/* ── Analyser button ── */
.btn-analyse{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:17px;border:none;border-radius:18px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;letter-spacing:.05em;color:#fff;background:linear-gradient(270deg,#1d4ed8,#0ea5e9,#7c3aed,#1d4ed8);background-size:400% 100%;animation:shimmer 4s linear infinite;box-shadow:0 0 24px rgba(56,189,248,.2),0 4px 20px rgba(0,0,0,.4);transition:all .2s;position:relative;overflow:hidden;margin-bottom:28px}
.btn-analyse::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.08),transparent);pointer-events:none}
.btn-analyse:active{transform:scale(.98);box-shadow:0 0 12px rgba(56,189,248,.15)}
.btn-analyse:disabled{opacity:.4;cursor:default;animation:none;background:#1e3a5f}
.btn-analyse-icon{font-size:20px}

/* ── Loading ── */
.analysis-loading{display:none;flex-direction:column;align-items:center;gap:16px;padding:36px 0;animation:fadeUp .3s ease}
.loading-ring{width:52px;height:52px;border-radius:50%;border:2px solid rgba(56,189,248,.1);border-top-color:var(--cyan);animation:spin .9s linear infinite;box-shadow:0 0 20px rgba(56,189,248,.15)}
.loading-label{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:var(--cyan);letter-spacing:.06em}
.loading-sub{font-size:11px;color:rgba(255,255,255,.3);text-align:center;max-width:220px;line-height:1.6}

/* ── Report ── */
.report-wrap{display:none;animation:fadeUp .4s ease;margin-bottom:24px}
.report-header{display:flex;align-items:center;gap:8px;margin-bottom:16px}
.report-title{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:var(--cyan);letter-spacing:.18em;text-transform:uppercase}
.report-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(56,189,248,.3),transparent)}
.grade-report{border-radius:20px;overflow:hidden;border:1px solid rgba(245,158,11,.18);box-shadow:0 0 40px rgba(245,158,11,.06)}
.grade-hero{padding:30px 22px 24px;text-align:center;background:linear-gradient(160deg,#0d0800,#160e00,#0a0d1a);border-bottom:1px solid rgba(245,158,11,.12);position:relative;overflow:hidden}
.grade-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(245,158,11,.08),transparent 60%);pointer-events:none}
.grade-score{font-family:'Space Grotesk',sans-serif;font-size:72px;font-weight:700;line-height:1;background:linear-gradient(135deg,#fde68a,#f59e0b,#fbbf24,#fcd34d);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite}
.grade-score-label{font-size:10px;color:rgba(255,255,255,.25);letter-spacing:.16em;text-transform:uppercase;margin-top:2px}
.grade-range{font-size:15px;color:rgba(251,191,36,.65);margin-top:8px;font-weight:600;font-family:'Space Grotesk',sans-serif}
.grade-verdict{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 18px;border-radius:999px;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.28);color:#fbbf24}
.grade-section{background:rgba(8,18,30,.55);border-bottom:1px solid rgba(245,158,11,.06);padding:15px 18px}
.grade-section:last-of-type{border-bottom:none}
.grade-section-title{font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:9px;display:flex;align-items:center;gap:8px}
.grade-section-title::before{content:'';width:3px;height:13px;border-radius:2px;flex-shrink:0}
.grade-section-title.grade-green{color:#4ade80}.grade-section-title.grade-green::before{background:#4ade80;box-shadow:0 0 6px rgba(74,222,128,.4)}
.grade-section-title.grade-yellow{color:#fbbf24}.grade-section-title.grade-yellow::before{background:#fbbf24;box-shadow:0 0 6px rgba(251,191,36,.4)}
.grade-section-title.grade-red{color:#f87171}.grade-section-title.grade-red::before{background:#f87171;box-shadow:0 0 6px rgba(248,113,113,.4)}
.grade-section-body{font-size:12px;line-height:1.75;color:rgba(255,255,255,.6)}
.grade-ratio{display:inline-block;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,.45);background:rgba(255,255,255,.04);border-radius:6px;padding:4px 10px;margin-bottom:7px}
.grade-blockers{background:rgba(239,68,68,.03);border-top:1px solid rgba(239,68,68,.1);border-bottom:1px solid rgba(239,68,68,.1);padding:15px 18px;display:flex;flex-direction:column;gap:10px}
.grade-blocker-item{font-size:12px;line-height:1.65;color:rgba(255,255,255,.65)}
.grade-advice{background:linear-gradient(135deg,rgba(56,189,248,.04),rgba(124,58,237,.04));padding:15px 18px;font-size:12px;line-height:1.75;color:rgba(255,255,255,.7)}
.err-box{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:14px;padding:14px 16px;font-size:13px;color:#fca5a5;line-height:1.6}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">Card<em>Scout</em></div>
  <div class="badge"><span class="badge-dot"></span>GRADING IA</div>
</div>

<div class="wrap">

  <div class="hero">
    <div class="lbl">Analyse professionnelle</div>
    <div class="hero-title">Scanner ta carte</div>
    <div class="hero-sub"><b>Plus tu es précis, plus le résultat sera fiable.</b><br>Ajoute autant de photos que tu veux : recto, verso, coins, détails, stamp… L'IA note ta carte selon les standards PSA/PCA.</div>
  </div>

  <!-- Photos -->
  <div class="photos-section">
    <div class="lbl">Photos de la carte</div>
    <div id="photos-grid" class="photos-grid"></div>
    <label for="fi-photo" class="btn-add">
      <span class="btn-add-icon">+</span>
      Ajouter une photo
    </label>
    <div id="photo-count" class="photo-count"></div>
  </div>

  <input type="file" id="fi-photo" accept="image/*" style="display:none"/>

  <!-- Contexte -->
  <div class="context-section">
    <div class="lbl">Précisions &amp; questions</div>
    <textarea id="ctx-input" class="tx" rows="3" placeholder="Ex: Dracaufeu holo 1ère édition, légère usure aux coins… — ou : Combien vaut-elle ? Est-ce un PSA 10 possible ?"></textarea>
    <div class="context-hint">💡 État, langue, édition, set, usure visible, question spécifique — chaque détail compte.</div>
  </div>

  <!-- Bouton -->
  <button id="btn-analyse" class="btn-analyse" onclick="analyzeCard()">
    <span class="btn-analyse-icon">⚡</span>
    Analyser la carte
  </button>

  <!-- Loading -->
  <div id="analysis-loading" class="analysis-loading">
    <div class="loading-ring"></div>
    <div class="loading-label">Analyse en cours…</div>
    <div class="loading-sub">L'IA examine chaque photo selon les critères PSA/PCA — centering, coins, bords, surface</div>
  </div>

  <!-- Rapport -->
  <div id="report-wrap" class="report-wrap">
    <div class="report-header">
      <div class="report-title">Rapport de grading</div>
      <div class="report-line"></div>
    </div>
    <div id="report-box"></div>
  </div>

</div>

<script>
var API_BASE = "${apiBase}";
var SESSION_ID = "${id}";
var photos = [];

document.getElementById('fi-photo').addEventListener('change', function() {
  var file = this.files[0];
  if (!file) return;
  this.value = '';
  compressImage(file, function(dataUrl) {
    photos.push({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', dataUrl: dataUrl });
    renderPhotos();
  });
});

function compressImage(file, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var MAX = 1280, w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.88));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderPhotos() {
  var grid = document.getElementById('photos-grid');
  grid.innerHTML = '';
  photos.forEach(function(p, idx) {
    var div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML =
      '<img src="' + p.dataUrl + '"/>' +
      '<div class="thumb-corner"></div>' +
      '<button class="thumb-del" onclick="removePhoto(' + idx + ')">×</button>' +
      '<span class="thumb-num">' + (idx + 1) + '</span>';
    grid.appendChild(div);
  });
  var c = document.getElementById('photo-count');
  c.textContent = photos.length ? photos.length + ' photo' + (photos.length > 1 ? 's' : '') : '';
}

function removePhoto(idx) { photos.splice(idx, 1); renderPhotos(); }

async function analyzeCard() {
  if (!photos.length) { alert("Ajoute au moins une photo avant d'analyser."); return; }

  var btn = document.getElementById('btn-analyse');
  btn.disabled = true;
  document.getElementById('analysis-loading').style.display = 'flex';
  document.getElementById('report-wrap').style.display = 'none';
  document.getElementById('report-box').innerHTML = '';
  setTimeout(function() {
    document.getElementById('analysis-loading').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);

  var ctx = (document.getElementById('ctx-input').value || '').trim();

  try {
    var resp = await fetch(API_BASE + '/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photos: photos.map(function(p) { return { base64: p.base64, mediaType: p.mediaType }; }),
        precision: ctx
      })
    });

    document.getElementById('analysis-loading').style.display = 'none';

    var reportBox = document.getElementById('report-box');
    if (!resp.ok) {
      var e = await resp.json().catch(function() { return {}; });
      reportBox.innerHTML = '<div class="err-box"><b>Erreur</b><br>' + (e.error || 'Réessaie dans quelques secondes.') + '</div>';
    } else {
      var data = await resp.json();
      reportBox.innerHTML = data.report || '<div class="err-box">Aucun rapport généré. Vérifie la clé GROQ_API_KEY dans .env</div>';
      // Notifie le desktop
      fetch(API_BASE + '/api/scan/upload/' + SESSION_ID, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: { base64: photos[0].base64, mediaType: 'image/jpeg', name: 'scan.jpg' } })
      }).catch(function() {});
    }

    document.getElementById('report-wrap').style.display = 'block';
    setTimeout(function() {
      document.getElementById('report-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

  } catch(err) {
    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('report-box').innerHTML = '<div class="err-box"><b>Erreur réseau</b><br>' + err.message + '</div>';
    document.getElementById('report-wrap').style.display = 'block';
  }

  btn.disabled = false;
}
</script>
</body>
</html>`;

  res.send(page);
}
