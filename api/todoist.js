const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-todoist-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.status(204).set(CORS_HEADERS).end();
    return;
  }

  // Set CORS headers for all responses
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  const token = req.headers["x-todoist-token"];
  if (!token) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const path = req.query?.path || "/projects";
  const method = req.method === "POST" ? "POST" : "GET";
  const body = req.method === "POST" ? JSON.stringify(req.body) : null;

  return new Promise((resolve) => {
    const options = {
      hostname: "api.todoist.com",
      path: "/api/v1" + path,
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    };

    const request = https.request(options, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        // 204 No Content (close task)
        if (apiRes.statusCode === 204) {
          res.status(200).json({ ok: true });
          resolve();
          return;
        }

        // Todoist API v1 повертає {results:[...], next_cursor:null}
        // Розпаковуємо — index.html очікує просто масив
        let normalized = data;
        try {
          const parsed = JSON.parse(data);
          if (parsed && Array.isArray(parsed.results)) {
            normalized = JSON.stringify(parsed.results);
          }
        } catch {}

        res.status(apiRes.statusCode)
           .setHeader("Content-Type", "application/json")
           .send(normalized || "[]");
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
