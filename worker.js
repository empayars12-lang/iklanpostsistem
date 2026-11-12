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

      // Membaca Token GitHub dari variable DEEPAPI_KEY yang anda tetapkan
      const GITHUB_TOKEN = env.DEEPAPI_KEY; 

      if (!GITHUB_TOKEN) {
        throw new Error("Token GitHub (DEEPAPI_KEY) tidak dijumpai di Cloudflare Settings.");
      }

      const service = body.service || "Cetak Baju";
      const problem = body.problem || "Mahu buat baju custom";
      const product = body.product || "";

      const promptText = `Anda ialah penulis iklan (copywriter) bahasa Melayu untuk ESK Printing / Empayar S Printing, kedai cetakan baju (DTF & silk screen) di Ketereh, Kelantan.

Servis: ${service}
Masalah Pelanggan: ${problem}
${product ? `Produk: ${product}` : ""}

Tulis 1 ayat iklan pendek & menarik untuk WhatsApp bagi mengajak pelanggan tempah baju. Guna bahasa Melayu yang santai dan persuasif.`;

      // Hantar permintaan ke GitHub Models Inference API (Model GPT-4o-mini)
      const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GITHUB_TOKEN}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Anda adalah copywriter profesional dalam bahasa Melayu." },
            { role: "user", content: promptText }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `GitHub Models error ${response.status}`);
      }

      const waText = data.choices?.[0]?.message?.content?.trim() || "Sila cuba lagi";

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
