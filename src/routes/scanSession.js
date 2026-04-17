import { networkInterfaces } from 'os';
import QRCode from 'qrcode';

const sessions = new Map();

function getLanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

export async function createSession(req, res) {
  try {
    const id = Math.random().toString(36).slice(2, 12);
    sessions.set(id, { created: Date.now(), image: null });
    setTimeout(() => sessions.delete(id), 10 * 60 * 1000);
    const port = process.env.PORT || 3000;
    const ip = getLanIP();
    const mobileUrl = `http://${ip}:${port}/m/${id}`;
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
    res.json({ id, mobileUrl, qrDataUrl });
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
  const ip = getLanIP();
  const apiBase = 'http://' + ip + ':' + port;
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
<title>CardScout Scanner</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--blue:#2563eb;--cyan:#38bdf8;--dark:#070f1f;--card:#0d1a2e}
body{background:var(--dark);min-height:100vh;font-family:'DM Sans',sans-serif;color:#fff;padding-bottom:60px;overflow-x:hidden}

/* Topbar */
.topbar{padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(56,189,248,.12);background:rgba(7,15,31,.9);backdrop-filter:blur(12px);position:sticky;top:0;z-index:20}
.logo{font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:700}
.logo em{color:var(--cyan);font-style:normal}
.badge-live{font-size:10px;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.25);color:var(--cyan);padding:3px 10px;border-radius:999px;font-weight:600;display:flex;align-items:center;gap:5px}
.badge-live::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--cyan);animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.3)}}

/* Layout */
.wrap{padding:24px 16px;max-width:460px;margin:0 auto}
.section-label{font-size:10px;font-weight:700;color:var(--cyan);letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:8px}
.section-label::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(56,189,248,.3),transparent)}
.page-title{font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;line-height:1.2;margin-bottom:6px;background:linear-gradient(135deg,#e0f2fe,#7dd3fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.page-sub{font-size:13px;color:rgba(255,255,255,.4);margin-bottom:28px;line-height:1.6}

/* Photo slots */
.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px}
.slot{position:relative;background:var(--card);border:1.5px solid rgba(56,189,248,.18);border-radius:20px;overflow:hidden;cursor:pointer;transition:all .25s;aspect-ratio:.72}
.slot::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(56,189,248,.08),transparent 60%);pointer-events:none}
.slot:active{transform:scale(.96);border-color:var(--cyan)}
.slot.filled{border-color:rgba(56,189,248,.5);box-shadow:0 0 20px rgba(56,189,248,.12)}
.slot-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px}
.slot-icon{font-size:32px;filter:drop-shadow(0 0 10px rgba(56,189,248,.4))}
.slot-name{font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:var(--cyan);letter-spacing:.06em}
.slot-hint{font-size:11px;color:rgba(255,255,255,.3)}
.slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.slot-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(7,15,31,.85) 0%,transparent 50%);pointer-events:none}
.slot-footer{position:absolute;bottom:0;left:0;right:0;padding:10px 12px;display:flex;align-items:center;justify-content:space-between}
.slot-footer-label{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:#fff}
.redo-btn{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:8px;padding:4px 9px;font-size:10px;cursor:pointer;backdrop-filter:blur(4px);font-family:'DM Sans',sans-serif}
.scan-corners{position:absolute;inset:0;pointer-events:none}
.scan-corners::before,.scan-corners::after{content:'';position:absolute;width:18px;height:18px;border-color:var(--cyan);border-style:solid;opacity:.7}
.scan-corners::before{top:10px;left:10px;border-width:2px 0 0 2px;border-radius:4px 0 0 0}
.scan-corners::after{bottom:10px;right:10px;border-width:0 2px 2px 0;border-radius:0 0 4px 0}

/* Divider */
.divider{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.divider-line{flex:1;height:1px;background:rgba(56,189,248,.1)}
.divider-text{font-size:11px;color:rgba(255,255,255,.2);white-space:nowrap}

/* Chat */
.chat-box{background:rgba(13,26,46,.8);border:1px solid rgba(56,189,248,.12);border-radius:16px;padding:14px;margin-bottom:14px;max-height:300px;overflow-y:auto;display:none;font-size:13px;line-height:1.7}
.chat-box::-webkit-scrollbar{width:3px}
.chat-box::-webkit-scrollbar-thumb{background:rgba(56,189,248,.3);border-radius:2px}
.ai-msg{padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid rgba(56,189,248,.08)}
.ai-msg:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.ai-label{font-size:9px;font-weight:700;color:var(--cyan);letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;display:flex;align-items:center;gap:5px}
.ai-label::before{content:'';width:4px;height:4px;border-radius:50%;background:var(--cyan)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{background:rgba(37,99,235,.15);border:1px solid rgba(56,189,248,.2);color:#7dd3fc;font-size:11px;padding:5px 11px;border-radius:20px;cursor:pointer;transition:background .15s;font-family:'DM Sans',sans-serif}
.chip:active{background:rgba(37,99,235,.35)}

/* Input */
.input-row{display:flex;gap:8px;align-items:flex-end}
.textarea{flex:1;background:rgba(13,26,46,.8);border:1px solid rgba(56,189,248,.2);border-radius:14px;padding:12px 14px;font-size:13px;color:#fff;font-family:'DM Sans',sans-serif;resize:none;outline:none;min-height:46px;max-height:120px;line-height:1.5;transition:border-color .2s}
.textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,.08)}
.textarea::placeholder{color:rgba(255,255,255,.25)}
.btn-send{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:none;border-radius:14px;padding:12px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;white-space:nowrap;flex-shrink:0;box-shadow:0 4px 16px rgba(37,99,235,.35);transition:all .2s;letter-spacing:.03em}
.btn-send:active{transform:scale(.97);box-shadow:0 2px 8px rgba(37,99,235,.3)}
.btn-send:disabled{opacity:.35;cursor:default;transform:none;box-shadow:none}
.hint{font-size:11px;color:rgba(255,255,255,.2);text-align:center;margin-top:10px}

/* Loader */
.loader{display:none;align-items:center;justify-content:center;gap:10px;padding:12px 0;font-size:12px;color:var(--cyan)}
.loader-dots{display:flex;gap:4px}
.loader-dots span{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:blink 1.2s infinite}
.loader-dots span:nth-child(2){animation-delay:.2s}
.loader-dots span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

/* Error */
.err-msg{color:#fca5a5;font-size:13px;padding:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;margin-bottom:8px}
</style>
</head>
<body>
<div class="topbar">
  <div class="logo">Card<em>Scout</em></div>
  <div class="badge-live">Scanner IA</div>
</div>

<div class="wrap">
  <div style="margin-bottom:28px">
    <div class="section-label">Identification IA</div>
    <div class="page-title">Scanner ta carte TCG</div>
    <div class="page-sub">Photographie le recto et le verso.<br>L'IA identifie la carte et répond à tes questions.</div>
  </div>

  <div class="photo-grid">
    <div class="slot" id="slot-front" onclick="triggerCapture('front')">
      <div class="slot-inner">
        <div class="slot-icon">🃏</div>
        <div class="slot-name">Recto</div>
        <div class="slot-hint">Face avant</div>
      </div>
      <div class="scan-corners"></div>
    </div>
    <div class="slot" id="slot-back" onclick="triggerCapture('back')">
      <div class="slot-inner">
        <div class="slot-icon">🔄</div>
        <div class="slot-name">Verso</div>
        <div class="slot-hint">Face arrière</div>
      </div>
      <div class="scan-corners"></div>
    </div>
  </div>

  <input type="file" id="fi-front" accept="image/*" capture="environment" style="display:none"/>
  <input type="file" id="fi-back"  accept="image/*" capture="environment" style="display:none"/>

  <div class="divider">
    <div class="divider-line"></div>
    <div class="divider-text">Pose ta question</div>
    <div class="divider-line"></div>
  </div>

  <div id="chat-box" class="chat-box"></div>
  <div id="chat-loader" class="loader"><div class="loader-dots"><span></span><span></span><span></span></div>Analyse en cours…</div>
  <div class="input-row">
    <textarea id="chat-input" class="textarea" placeholder="Prix ? Rareté ? Vaut-elle le coup ?" rows="2"></textarea>
    <button id="btn-send" class="btn-send" onclick="sendQuestion()">Analyser</button>
  </div>
  <div class="hint">Au moins une photo requise</div>
</div>

<script>
var API_BASE = "${apiBase}";
var photos = { front: null, back: null };

function triggerCapture(side) {
  document.getElementById('fi-' + side).click();
}

function compressImage(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var MAX = 1024;
      var w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
      else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupInput(side) {
  document.getElementById('fi-' + side).addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    this.value = '';
    compressImage(file, function(dataUrl) {
      photos[side] = { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', name: side + '.jpg' };
      var slot = document.getElementById('slot-' + side);
      slot.classList.add('filled');
      var label = side === 'front' ? 'Recto' : 'Verso';
      slot.innerHTML = '<img src="' + dataUrl + '"/><div class="slot-overlay"></div><div class="slot-footer"><span class="slot-footer-label">' + label + '</span><button class="redo-btn" onclick="event.stopPropagation();triggerCapture(\\'' + side + '\\')">Refaire</button></div><div class="scan-corners"></div>';
    });
  });
}
setupInput('front');
setupInput('back');

async function sendQuestion() {
  var msg = (document.getElementById('chat-input').value || '').trim();
  if (!msg) msg = "Identifie cette carte TCG : donne son nom exact, son set, sa rareté et une estimation de son prix actuel.";
  if (!photos.front && !photos.back) {
    alert("Prends au moins une photo avant d'analyser.");
    return;
  }
  var btn = document.getElementById('btn-send');
  btn.disabled = true;
  var loader = document.getElementById('chat-loader');
  loader.style.display = 'flex';
  var chatBox = document.getElementById('chat-box');
  chatBox.style.display = 'block';
  document.getElementById('chat-input').value = '';

  var content = [];
  if (photos.front) {
    content.push({ type: 'text', text: '[Recto de la carte]' });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photos.front.base64 } });
  }
  if (photos.back) {
    content.push({ type: 'text', text: '[Verso de la carte]' });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photos.back.base64 } });
  }
  content.push({ type: 'text', text: msg });

  try {
    var resp = await fetch(API_BASE + '/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, collection: [], _rawContent: content })
    });
    loader.style.display = 'none';
    if (!resp.ok) {
      var errText = await resp.text();
      appendError('Erreur serveur (' + resp.status + '). Réessaie.');
      console.error(errText);
      btn.disabled = false;
      return;
    }
    var data = await resp.json();
    appendMsg(data.reply || 'Aucune réponse.', data.suggestions || []);
  } catch(e) {
    loader.style.display = 'none';
    appendError('Erreur réseau : ' + e.message);
  }
  btn.disabled = false;
}

function appendMsg(reply, suggestions) {
  var chatBox = document.getElementById('chat-box');
  var div = document.createElement('div');
  div.className = 'ai-msg';
  div.innerHTML = '<div class="ai-label">CardScout IA</div>' + reply;
  if (suggestions.length) {
    var chips = '<div class="chips">';
    for (var i = 0; i < suggestions.length; i++) {
      chips += '<button class="chip" onclick="setQ(this.textContent)">' + suggestions[i] + '</button>';
    }
    chips += '</div>';
    div.innerHTML += chips;
  }
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendError(msg) {
  var chatBox = document.getElementById('chat-box');
  chatBox.style.display = 'block';
  var div = document.createElement('div');
  div.className = 'err-msg';
  div.textContent = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setQ(text) {
  document.getElementById('chat-input').value = text;
  document.getElementById('chat-input').focus();
}

document.getElementById('chat-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
});
</script>
</body>
</html>`;

  res.send(page);
}
