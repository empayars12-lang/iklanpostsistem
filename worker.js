// Cloudflare Worker: jambatan selamat antara app ESK Kreatif dan API AI.
// Kunci API disimpan di sini (Secret), BUKAN dalam app.
//
// Pemboleh ubah di Cloudflare (Settings > Variables and Secrets):
//   ANTHROPIC_API_KEY  (Secret)  kunci API anda
//   APP_KEY            (Secret)  kata laluan ringkas, sama dengan yang diisi di Tetapan app
//   ALLOWED_ORIGIN     (Text)    cth https://namaanda.github.io   (tanpa / di hujung, tanpa nama repo)
//   MODEL              (Text, pilihan) lalai: claude-haiku-5-5

const SYSTEM = `Anda penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.
Tugas: lihat gambar yang diberi, kenal pasti apa yang ditunjukkan (jenis pakaian/produk, warna, jenis cetakan jika jelas), kemudian tulis ayat iklan yang MENGAJAK ORANG MEMBELI dengan menyelesaikan masalah pelanggan.

Formula: (1) hook yang menyentuh masalah pelanggan, (2) penyelesaian ringkas, (3) tawaran/dorongan jika diberi, (4) ajakan jelas untuk mesej WhatsApp.
Peraturan keras:
- Jangan puji kualiti kosong ("berkualiti tinggi", "terbaik"). Fokus pada masalah pelanggan dan bagaimana ia selesai.
- Jangan reka fakta: harga, diskaun, tempoh siap, jaminan, kuantiti minimum, atau tarikh TIDAK BOLEH disebut kecuali diberi dalam maklumat pengguna.
- Jangan reka apa yang tidak nampak dalam gambar. Jika gambar tidak jelas, tulis secara umum.
- Jangan masukkan nombor telefon, link atau hashtag (app akan tambah sendiri).
- Gaya bahasa ikut arahan: "kelantan" = santai loghat Kelantan ringan (cth: demo, jange, tau, comel); "santai" = BM harian mesra; "formal" = BM sopan, emoji minimum.
- Emoji secara sederhana.

Pulangkan HANYA satu objek JSON (tanpa markdown) dengan kunci:
"wa": ayat WhatsApp/Status, 2-4 baris pendek.
"reel": kapsyen TikTok/Reels, hook dalam baris pertama, maksimum 4 baris.
"video": idea video menegak 15 saat: 0-3s, 3-10s, 10-15s (teks atas skrin & apa nak ditunjuk berdasarkan gambar).
"main": post Facebook/Instagram penuh: hook masalah, penyelesaian, 3 langkah tempah ringkas, ajakan mesej WhatsApp. 700 aksara ke bawah.`;

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'Gunakan POST' }, 405, cors);

    if (env.APP_KEY && req.headers.get('X-App-Key') !== env.APP_KEY)
      return json({ error: 'Kunci app tidak sah' }, 401, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Kunci API belum dipasang di Cloudflare' }, 500, cors);

    let b;
    try { b = await req.json(); } catch (e) { return json({ error: 'Data tidak sah' }, 400, cors); }

    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(b.image || '');
    if (!m) return json({ error: 'Gambar tidak sah' }, 400, cors);
    if (m[2].length > 1500000) return json({ error: 'Gambar terlalu besar' }, 413, cors);

    const cut = (s, n) => String(s || '').slice(0, n);
    const info = [
      `Servis dipilih: ${cut(b.service, 120)}`,
      `Masalah pelanggan untuk diselesaikan: ${cut(b.problem, 120)}`,
      `Gaya bahasa: ${cut(b.tone, 10)}`,
      b.product ? `Maklumat produk: ${cut(b.product, 200)}` : '',
      b.time ? `Tempoh siap (benar, boleh disebut): ${cut(b.time, 80)}` : '',
      b.offer ? `Tawaran (benar, boleh disebut): ${cut(b.offer, 200)}` : '',
      b.urgency ? `Dorongan masa (benar, boleh disebut): ${cut(b.urgency, 80)}` : ''
    ].filter(Boolean).join('\n');

    const payload = {
      model: env.MODEL || 'claude-haiku-5-5',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
          { type: 'text', text: info + '\n\nTulis ayat iklan sekarang. Pulangkan JSON sahaja.' }
        ]
      }]
    };

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(payload)
      });
    } catch (e) { return json({ error: 'Tidak dapat hubungi AI' }, 502, cors); }

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: (data.error && data.error.message) || 'Ralat AI ' + r.status }, 502, cors);

    const text = ((data.content || []).find(c => c.type === 'text') || {}).text || '';
    const i = text.indexOf('{'), j = text.lastIndexOf('}');
    let out;
    try { out = JSON.parse(text.slice(i, j + 1)); } catch (e) { return json({ error: 'AI beri jawapan tidak sah, cuba lagi' }, 502, cors); }

    return json({ wa: out.wa || '', reel: out.reel || '', video: out.video || '', main: out.main || '' }, 200, cors);
  }
};
