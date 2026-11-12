// Cloudflare Worker: AI percuma menggunakan model Llama
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

      // Memanggil model percuma Cloudflare AI (Llama 3 8B)
      const aiResponse = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { 
            role: "system", 
            content: "Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan. Pulangkan jawapan ringkas." 
          },
          { 
            role: "user", 
            content: `Servis: ${body.service || 'Cetak Baju'}\nMasalah: ${body.problem || 'Mahu buat baju custom'}\nTulis ayat iklan pendek untuk WhatsApp.` 
          }
        ]
      });

      return new Response(JSON.stringify({ wa: aiResponse.response || "Sila cuba lagi" }), {
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
