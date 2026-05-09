/**
 * Email sender via Resend (https://resend.com).
 * Si RESEND_API_KEY n'est pas défini, les appels deviennent des no-ops avec warning.
 */
const RESEND_URL = 'https://api.resend.com/emails';

function fmtPrice(n) {
  if (n == null) return '—';
  return n >= 1000 ? Math.round(n).toLocaleString('fr-FR') + ' €' : (Math.round(n * 100) / 100).toFixed(2) + ' €';
}

async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL || 'Cardscout <onboarding@resend.dev>';
  if (!key) {
    console.warn(`📧 Email non envoyé (RESEND_API_KEY manquante) — to=${to} subject=${subject}`);
    return { ok: false, skipped: true };
  }
  if (!to) return { ok: false, error: 'no recipient' };
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text })
    });
    if (!r.ok) {
      const err = await r.text();
      console.error(`📧 Resend ${r.status}: ${err}`);
      return { ok: false, error: err };
    }
    const data = await r.json();
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('📧 Email erreur:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendAlertEmail(to, alert) {
  const dirSym = alert.dir === 'lt' ? 'descendu sous' : 'monté au-dessus de';
  const subject = `🔔 ${alert.cardName} ${alert.dir === 'lt' ? '<' : '>'} ${fmtPrice(alert.threshold)}`;
  const cardName = alert.cardName || 'Une carte';
  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#0a2580;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15));border:1px solid rgba(99,102,241,.4);border-radius:14px;padding:18px;margin-bottom:18px">
      <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.55);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">Alerte prix Cardscout</div>
      <div style="font-size:22px;font-weight:700;line-height:1.2">${cardName}</div>
      <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:6px">vient de passer ton seuil</div>
    </div>
    <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px;margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <span style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em">Prix actuel</span>
        <span style="font-size:24px;font-weight:700;color:${alert.dir === 'lt' ? '#4ade80' : '#f87171'}">${fmtPrice(alert.firedPrice || alert.currentPrice)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:11px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em">Ton seuil</span>
        <span style="font-size:14px;color:rgba(255,255,255,.7)">${alert.dir === 'lt' ? '<' : '>'} ${fmtPrice(alert.threshold)}</span>
      </div>
    </div>
    <div style="font-size:13px;color:rgba(255,255,255,.7);line-height:1.5;margin-bottom:18px">
      Le prix de <b style="color:#fff">${cardName}</b> est ${dirSym} ${fmtPrice(alert.threshold)} sur ${alert.plat || 'Cardmarket'}.
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,.35);text-align:center;margin-top:24px">
      Tu reçois ce mail parce que tu as créé une alerte sur Cardscout.<br>
      Pour ne plus la recevoir, supprime l'alerte dans l'application.
    </div>
  </div>
</body>
</html>`;
  const text = `${cardName} ${dirSym} ${fmtPrice(alert.threshold)}.
Prix actuel : ${fmtPrice(alert.firedPrice || alert.currentPrice)}
Plateforme : ${alert.plat || 'Cardmarket'}

Tu reçois ce mail parce que tu as créé une alerte sur Cardscout.`;
  return sendEmail({ to, subject, html, text });
}
