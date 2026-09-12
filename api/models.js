const CLIENT_AGENT = "JepongDevxyz-API-Tester:1.1:https://github.com/JepongDevxyz/GitHub-Claude-Test";

const BLOCKED_NAME_PATTERNS = [
  /nsfw/i,
  /hentai/i,
  /porn/i,
  /erotic/i,
  /sexual/i,
  /\bsex\b/i,
  /\badult\b/i,
  /\berp\b/i,
  /explicit/i,
  /fetish/i
];

function isAllowedModelName(name) {
  return typeof name === "string" &&
    name.trim().length > 0 &&
    !BLOCKED_NAME_PATTERNS.some(pattern => pattern.test(name));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeModel(item) {
  return {
    name: item.name,
    workers: toNumber(item.count ?? item.workers ?? item.threads),
    threads: item.threads == null ? null : toNumber(item.threads),
    queued: toNumber(item.queued),
    jobs: toNumber(item.jobs),
    eta: toNumber(item.eta),
    performance: toNumber(item.performance),
    type: item.type || "text"
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      "https://aihorde.net/api/v2/status/models?type=text",
      {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "Client-Agent": CLIENT_AGENT
        }
      }
    );

    const rawText = await response.text();
    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        httpStatus: response.status,
        error: data?.message || data?.error || rawText || "AI Horde model status request failed"
      });
    }

    if (!Array.isArray(data)) {
      return res.status(502).json({
        ok: false,
        httpStatus: 502,
        error: "Unexpected AI Horde model-list response"
      });
    }

    const models = data
      .filter(item => item && isAllowedModelName(item.name))
      .map(normalizeModel)
      .sort((a, b) => {
        if (b.workers !== a.workers) return b.workers - a.workers;
        if (a.eta !== b.eta) return a.eta - b.eta;
        return b.performance - a.performance;
      });

    return res.status(200).json({
      ok: true,
      provider: "AI Horde",
      updatedAt: new Date().toISOString(),
      count: models.length,
      models
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      httpStatus: 500,
      error:
        error?.name === "AbortError"
          ? "Timed out while loading live AI Horde models"
          : error?.message || "Unknown model-list error"
    });
  } finally {
    clearTimeout(timeout);
  }
};
