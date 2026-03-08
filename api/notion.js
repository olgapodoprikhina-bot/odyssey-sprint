const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-notion-token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).set(CORS_HEADERS).end();
    return;
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const token = req.headers["x-notion-token"];
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }

  // Читаємо path з повного URL щоб уникнути проблем з Vercel rewrite + query parsing
  let notionPath = "/users/me";
  try {
    const url = new URL(req.url, "https://placeholder.com");
    notionPath = url.searchParams.get("path") || "/users/me";
  } catch {
    notionPath = req.query?.path || "/users/me";
  }

  const method = req.method === "POST" || req.method === "PATCH" ? req.method : "GET";
  const body = (method === "POST" || method === "PATCH") ? JSON.stringify(req.body) : null;

  return new Promise((resolve) => {
    const options = {
      hostname: "api.notion.com",
      path: "/v1" + notionPath,
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    };

    const request = https.request(options, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        res.status(apiRes.statusCode)
           .setHeader("Content-Type", "application/json")
           .send(data || "{}");
        resolve();
      });
    });

    request.on("error", (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    if (body) request.write(body);
    request.end();
  });
};
