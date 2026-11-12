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

      // === GANTI DENGAN API KEY ANDA (bermula dengan AQ.) ===
      const GEMINI_API_KEY = "AQ.Ab8RN6JWeVXwq9-EZTVNxJcQSu7s5SrNZaKAfNERtOdQXWMAxw";

      const service = body.service || "Cetak Baju";
      const problem = body.problem || "Mahu buat baju custom";
      const product = body.product || "";

      const promptText = `Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.

Servis: ${service}
Masalah Pelanggan: ${problem}
${product ? `Produk: ${product}` : ""}

Tulis 1 ayat iklan pendek & menarik untuk WhatsApp bagi mengajak pelanggan tempah baju. Guna bahasa Melayu yang santai dan persuasif.`;

      let contents = [{ parts: [{ text: promptText }] }];

      // Support gambar jika ada
      if (body.image) {
        const base64Data = body.image.split(",")[1] || body.image;
        contents = [{
          parts: [
            { 
              text: promptText + " Sila teliti gambar produk/baju ini dan masukkan butiran visual (warna, design, dll) ke dalam ayat iklan." 
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }];
      }

      // Model yang disyorkan (November 2026)
      // Cuba "gemini-3.8-flash" dulu. Kalau gagal, tukar kepada "gemini-3.5-flash-lite"
      const model = "gemini-3.8-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
          },
          body: JSON.stringify({ contents })
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        // Return error sebenar dari Gemini supaya mudah debug
        throw new Error(data.error?.message || `Gemini error ${response.status}`);
      }

      const waText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sila cuba lagi";

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
