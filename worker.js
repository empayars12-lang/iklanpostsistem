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

      const service = body.service || "Cetak Baju";
      const problem = body.problem || "Mahu buat baju custom";
      const product = body.product || "";

      const promptText = `Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.

Servis: ${service}
Masalah Pelanggan: ${problem}
${product ? `Produk: ${product}` : ""}

Tulis 1 ayat iklan pendek & menarik untuk WhatsApp bagi mengajak pelanggan tempah baju. Guna bahasa Melayu yang santai dan persuasif.`;

      // Menggunakan enjin AI percuma bawaan Cloudflare (Llama 3)
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          { role: "system", content: "Anda adalah copywriter profesional dalam bahasa Melayu." },
          { role: "user", content: promptText }
        ]
      });

      const waText = response.response?.trim() || "Sila cuba lagi";

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
