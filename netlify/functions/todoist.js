const https = require("https");

exports.handler = async (event) => {
  const token = event.headers["x-todoist-token"];
  if (!token) return { statusCode: 401, body: "No token" };

  const path = event.queryStringParameters?.path || "/projects";
  const method = event.httpMethod === "POST" ? "POST" : "GET";
  const body = event.body || null;

  return new Promise((resolve) => {
    const options = {
      hostname: "api.todoist.com",
      path: "/api/v1" + path,  // ОНОВЛЕНО: v2 → v1
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
        resolve({
          statusCode: res.statusCode,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: data,
        });
      });
    });
    req.on("error", (e) => resolve({ statusCode: 500, body: e.message }));
    if (body) req.write(body);
    req.end();
  });
};
