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
    anonymous: true
  }
};

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

async function getAIHordeModel(signal) {
  const candidates = [
    "https://oai.aihorde.net/v1/models?max_size=8",
    "https://oai.aihorde.net/v1/models"
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        signal,
        headers: {
          "Authorization": "Bearer 0000000000",
          "Client-Agent": "JepongDevxyz-API-Tester:1.0:https://github.com/JepongDevxyz/GitHub-Claude-Test"
        }
      });

      if (!response.ok) continue;
      const data = await response.json();
      const models = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      const usable = models
        .map(item => typeof item === "string" ? item : item?.id)
        .filter(id => typeof id === "string" && id.trim());

      if (usable.length) return usable[0];
    } catch {
      // Try the broader model listing next.
    }
  }

  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const { target } = req.body || {};
  const config = TARGETS[target];

  if (!config) {
    return res.status(400).json({ ok: false, error: "Invalid test target" });
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    let model = config.model;

    if (config.anonymous) {
      model = await getAIHordeModel(controller.signal);
      if (!model) {
        return res.status(503).json({
          ok: false,
          provider: config.provider,
          model: config.model,
          httpStatus: 503,
          latency: Date.now() - started,
          error: "AI Horde is reachable, but no active text model could be selected right now."
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
        headers["Client-Agent"] = "JepongDevxyz-API-Tester:1.0:https://github.com/JepongDevxyz/GitHub-Claude-Test";
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
      requestedModel: config.model,
      resolvedModel: data?.model || model,
      httpStatus: response.status,
      latency,
      answer,
      raw: data
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      provider: config.provider,
      model: config.model,
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
