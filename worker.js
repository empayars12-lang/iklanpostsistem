// Cloudflare Worker: Gemini API (Percuma, Boleh Baca Teks & Gambar)
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
      
      // API Key Google AI Studio anda
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

      // Menggunakan Endpoint v1beta dengan Model Terbaharu Gemini
      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;

      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (data.error) {
        // Jika model 2.5 belum diaktifkan, cuba gunakan model 2.0-flash
        const fallbackUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_API_KEY;
        const resFallback = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents })
        });
        const dataFallback = await resFallback.json();
        
        if (dataFallback.error) {
          throw new Error(dataFallback.error.message || data.error.message || "Ralat Gemini API");
        }
        
        const waTextFB = dataFallback.candidates?.[0]?.content?.parts?.[0]?.text || "Sila cuba lagi";
        return new Response(JSON.stringify({ wa: waTextFB }), {
          headers: { "Content-Type": "application/json", ...cors }
        });
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
