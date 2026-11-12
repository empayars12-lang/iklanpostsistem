// Cloudflare Worker: DeepSeek AI Integration
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
      
      // Ambil API Key dari environment variable Cloudflare
      const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY; 

      if (!DEEPSEEK_API_KEY) {
        throw new Error("API Key DeepSeek tidak dijumpai dalam tetapan Cloudflare.");
      }

      const promptText = `Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.
Servis: ${body.service || 'Cetak Baju'}
Masalah Pelanggan: ${body.problem || 'Mahu buat baju custom'}
${body.product ? `Produk: ${body.product}` : ''}

Tulis 1 ayat iklan pendek & menarik untuk WhatsApp bagi mengajak pelanggan tempah baju.`;

      // Nota: DeepSeek buat masa ini TIDAK menyokong input gambar (Vision) untuk model utamanya.
      // Jadi jika ada gambar, kita cuma beritahu AI bahawa ada gambar, tapi tidak menghantar imej asal.
      let finalPrompt = promptText;
      if (body.image) {
        finalPrompt += " (Nota: Pelanggan turut melampirkan gambar produk, jadikan ayat lebih meyakinkan).";
      }

      const messages = [
        { role: "user", content: finalPrompt }
      ];

      const deepseekUrl = "https://api.deepseek.com/chat/completions";

      const response = await fetch(deepseekUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}` // Guna Bearer Token
        },
        body: JSON.stringify({ 
          model: "deepseek-chat", // Model standard DeepSeek
          messages: messages
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Ralat DeepSeek API");
      }

      // Ambil teks hasil dari respons DeepSeek (format OpenAI)
      const waText = data.choices?.[0]?.message?.content || "Sila cuba lagi";

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
