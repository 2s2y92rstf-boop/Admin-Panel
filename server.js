const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

// In-memory log storage (replace with DB in production)
const logs = [];
const MAX_LOGS = 500;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // POST /log — receive event from site
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const logEntry = {
          id: Date.now() + Math.random(),
          time: new Date().toLocaleTimeString("uk-UA"),
          timestamp: Date.now(),
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
          userAgent: req.headers["user-agent"] || "",
          ...data,
        };

        logs.unshift(logEntry);
        if (logs.length > MAX_LOGS) logs.pop();

        // Broadcast to all connected admin clients
        broadcast({ type: "new_log", log: logEntry });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // GET /logs — get all logs (for initial admin load)
  if (req.method === "GET" && req.url === "/logs") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(logs));
    return;
  }

  // GET /stats — summary stats
  if (req.method === "GET" && req.url === "/stats") {
    const stats = {
      total: logs.length,
      logins: logs.filter((l) => l.form === "login").length,
      registers: logs.filter((l) => l.form === "register").length,
      payments: logs.filter((l) => l.form === "payment").length,
      errors: logs.filter((l) => l.level === "error").length,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// WebSocket server (attached to same HTTP server)
const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  console.log("[WS] Admin connected");

  // Send last 100 logs on connect
  ws.send(JSON.stringify({ type: "init", logs: logs.slice(0, 100) }));

  ws.on("close", () => console.log("[WS] Admin disconnected"));
  ws.on("error", (e) => console.error("[WS] Error:", e.message));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

server.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket at ws://localhost:${PORT}/ws`);
  console.log(`📝 POST logs to http://localhost:${PORT}/log\n`);
});
