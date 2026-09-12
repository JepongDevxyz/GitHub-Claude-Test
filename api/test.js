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

const TARGETS = {
  "openapis:gpt-5.4": {
    provider: "OpenAPIs",
    model: "gpt-5.4",
    apiStyle: "openai",
    endpoint: "https://api.openapis.online/openai/v1/chat/completions"
  },
  "openapis:gpt-5.4-mini": {
    provider: "OpenAPIs",
    model: "gpt-5.4-mini",
    apiStyle: "openai",
    endpoint: "https://api.openapis.online/openai/v1/chat/completions"
  },
  "openapis:gpt-5.4-nano": {
    provider: "OpenAPIs",
    model: "gpt-5.4-nano",
    apiStyle: "openai",
    endpoint: "https://api.openapis.online/openai/v1/chat/completions"
  },
  "openapis:gpt-5.3-codex": {
    provider: "OpenAPIs",
    model: "gpt-5.3-codex",
    apiStyle: "openai",
    endpoint: "https://api.openapis.online/openai/v1/chat/completions"
  },
  "openapis:gpt-5.3-instant": {
    provider: "OpenAPIs",
    model: "gpt-5.3-instant",
    apiStyle: "openai",
    endpoint: "https://api.openapis.online/openai/v1/chat/completions"
  },
  "openapis:claude-opus-4-7": {
    provider: "OpenAPIs",
    model: "claude-opus-4-7",
    apiStyle: "anthropic",
    endpoint: "https://api.openapis.online/anthropic/v1/messages"
  },
  "openapis:claude-sonnet-4-6": {
    provider: "OpenAPIs",
    model: "claude-sonnet-4-6",
    apiStyle: "anthropic",
    endpoint: "https://api.openapis.online/anthropic/v1/messages"
  },
  "openapis:claude-haiku-4-5": {
    provider: "OpenAPIs",
    model: "claude-haiku-4-5",
    apiStyle: "anthropic",
    endpoint: "https://api.openapis.online/anthropic/v1/messages"
  },
  "aihorde:anonymous": {
    provider: "AI Horde",
    model: "auto-select active model",
    apiStyle: "openai",
    endpoint: "https://oai.aihorde.net/v1/chat/completions",
    anonymous: true,
    autoSelect: true
  },
  "aihorde:model": {
    provider: "AI Horde",
    model: null,
    apiStyle: "openai",
    endpoint: "https://oai.aihorde.net/v1/chat/completions",
    anonymous: true,
    selectedModel: true
  }
};

function isAllowedModelName(name) {
  return typeof name === "string" &&
    name.trim().length > 0 &&
    !BLOCKED_NAME_PATTERNS.some(pattern => pattern.test(name));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function extractText(data, apiStyle) {
  if (apiStyle === "anthropic") {
    const content = data?.content;
    if (!Array.isArray(content)) return null;
    const text = content
      .filter(item => item?.type === "text" && typeof item?.text === "string")
      .map(item => item.text)
      .join("")
      .trim();
    return text || null;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();

  if (Array.isArray(content)) {
    const text = content
      .map(part => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
    if (text) return text;
  }

  const legacy = data?.choices?.[0]?.text;
  return typeof legacy === "string" && legacy.trim() ? legacy.trim() : null;
}

async function getActiveAIHordeModels(signal) {
  const response = await fetch(
    "https://aihorde.net/api/v2/status/models?type=text",
    {
      signal,
      headers: {
        "Accept": "application/json",
        "Client-Agent": CLIENT_AGENT
      }
    }
  );

  if (!response.ok) {
    throw new Error(`AI Horde model status returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected AI Horde model status response");
  }

  return data
    .filter(item => item && isAllowedModelName(item.name))
    .map(item => ({
      name: item.name,
      workers: toNumber(item.count ?? item.workers ?? item.threads),
      queued: toNumber(item.queued),
      jobs: toNumber(item.jobs),
      eta: toNumber(item.eta),
      performance: toNumber(item.performance)
    }));
}

function pickBestAIHordeModel(models) {
  if (!Array.isArray(models) || !models.length) return null;

  return [...models]
    .sort((a, b) => {
      if (b.workers !== a.workers) return b.workers - a.workers;
      if (a.eta !== b.eta) return a.eta - b.eta;
      return b.performance - a.performance;
    })[0];
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const { target, model: requestedModel } = req.body || {};
  const config = TARGETS[target];

  if (!config) {
    return res.status(400).json({ ok: false, error: "Invalid test target" });
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    let model = config.model;
    let modelStats = null;

    if (config.anonymous) {
      const activeModels = await getActiveAIHordeModels(controller.signal);

      if (config.selectedModel) {
        if (!isAllowedModelName(requestedModel)) {
          return res.status(400).json({
            ok: false,
            provider: config.provider,
            httpStatus: 400,
            error: "Invalid or unavailable model selection"
          });
        }

        modelStats = activeModels.find(item => item.name === requestedModel) || null;
        if (!modelStats) {
          return res.status(409).json({
            ok: false,
            provider: config.provider,
            model: requestedModel,
            httpStatus: 409,
            latency: Date.now() - started,
            error: "That AI Horde model is no longer active. Refresh the live model list and try another model."
          });
        }

        model = modelStats.name;
      } else {
        modelStats = pickBestAIHordeModel(activeModels);
        model = modelStats?.name || null;
      }

      if (!model) {
        return res.status(503).json({
          ok: false,
          provider: config.provider,
          model: config.model,
          httpStatus: 503,
          latency: Date.now() - started,
          error: "AI Horde is reachable, but no active general text model could be selected right now."
        });
      }
    }

    const headers = { "Content-Type": "application/json" };
    let body;

    if (config.provider === "OpenAPIs" && config.apiStyle === "anthropic") {
      headers["x-api-key"] = "admin";
      headers["anthropic-version"] = "2023-06-01";
      body = {
        model,
        max_tokens: 96,
        stream: false,
        messages: [
          {
            role: "user",
            content: "Reply with exactly one short sentence confirming you can respond."
          }
        ]
      };
    } else {
      headers.Authorization = `Bearer ${config.anonymous ? "0000000000" : "admin"}`;

      if (config.anonymous) {
        headers["Client-Agent"] = CLIENT_AGENT;
      }

      body = {
        model,
        stream: false,
        messages: [
          {
            role: "user",
            content: "Reply with exactly one short sentence confirming you can respond."
          }
        ]
      };

      if (config.provider === "OpenAPIs") {
        body.max_completion_tokens = 96;
      } else {
        body.max_tokens = 48;
        body.timeout = 45;
      }
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(body)
    });

    const latency = Date.now() - started;
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    const answer = extractText(data, config.apiStyle);

    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok && Boolean(answer),
      provider: config.provider,
      model,
      requestedModel: requestedModel || config.model,
      resolvedModel: data?.model || model,
      modelStats,
      httpStatus: response.status,
      latency,
      answer,
      raw: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      provider: config.provider,
      model: requestedModel || config.model,
      latency: Date.now() - started,
      httpStatus: 500,
      error:
        error?.name === "AbortError"
          ? "Request timed out. Anonymous AI Horde requests can be slower because they have the lowest queue priority."
          : error?.message || "Unknown request error"
    });
  } finally {
    clearTimeout(timeout);
  }
};
