const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-todoist-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const token = event.headers["x-todoist-token"];
  if (!token) return { statusCode: 401, headers: CORS_HEADERS, body: "No token" };

  const path = event.queryStringParameters?.path || "/projects";
  const method = event.httpMethod === "POST" ? "POST" : "GET";
  const body = event.body || null;

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

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        // 204 No Content (напр. close task) — повернути порожній успіх
        if (res.statusCode === 204) {
          resolve({
            statusCode: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            body: JSON.stringify({ ok: true }),
          });
          return;
        }
        resolve({
          statusCode: res.statusCode,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          body: data || JSON.stringify({}),
        });
      });
    });

    req.on("error", (e) =>
      resolve({ statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: e.message }) })
    );
    if (body) req.write(body);
    req.end();
  });
};
