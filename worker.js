// Cloudflare Worker: Gemini 1.5 Flash (Format Sah Parameter URL)
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Gunakan POST" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }

    try {
      const body = await request.json();
      
      // API Key sah dari Google AI Studio anda
      const GEMINI_API_KEY = "AQ.Ab8RN6IyKwymarosg2M7U5acW55OdP7_v7MtHaUj0oUnHqTI8w";

      const promptText = `Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.
Servis: ${body.service || 'Cetak Baju'}
Masalah Pelanggan: ${body.problem || 'Mahu buat baju custom'}
${body.product ? `Produk: ${body.product}` : ''}

Tulis 1 ayat iklan pendek & menarik untuk WhatsApp bagi mengajak pelanggan tempah baju.`;

      let contents = [];

      if (body.image) {
        const base64Data = body.image.split(',')[1] || body.image;
        contents = [
          {
            parts: [
              { text: promptText + " Sila teliti gambar produk/baju ini dan masukkan butiran visual (seperti warna atau jenis cetakan) ke dalam ayat iklan." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ];
      } else {
        contents = [
          {
            parts: [{ text: promptText }]
          }
        ];
      }

      // Hantar API Key melalui parameter URL (Format Wajib Gemini API)
      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Ralat Gemini API");
      }

      const waText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sila cuba lagi";

      return new Response(JSON.stringify({ wa: waText }), {
        headers: { "Content-Type": "application/json", ...cors }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors }
      });
    }
  }
};
