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
  "openrouter:free": {
    provider: "OpenRouter",
    model: "openrouter/free",
    apiStyle: "openai",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    envKey: "OPENROUTER_API_KEY"
  },
  "groq:gpt-oss-20b": {
    provider: "Groq",
    model: "openai/gpt-oss-20b",
    apiStyle: "openai",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    envKey: "GROQ_API_KEY"
  },
  "groq:gpt-oss-120b": {
    provider: "Groq",
    model: "openai/gpt-oss-120b",
    apiStyle: "openai",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    envKey: "GROQ_API_KEY"
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
  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

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

  const apiKey = config.envKey ? process.env[config.envKey] : null;

  if (config.envKey && !apiKey) {
    return res.status(428).json({
      ok: false,
      configured: false,
      provider: config.provider,
      model: config.model,
      requiredEnv: config.envKey,
      httpStatus: 428,
      error: `Missing Vercel environment variable: ${config.envKey}`
    });
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const headers = { "Content-Type": "application/json" };
    let body;

    if (config.provider === "OpenAPIs" && config.apiStyle === "anthropic") {
      headers["x-api-key"] = "admin";
      headers["anthropic-version"] = "2023-06-01";
      body = {
        model: config.model,
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
      headers.Authorization = `Bearer ${config.provider === "OpenAPIs" ? "admin" : apiKey}`;

      if (config.provider === "OpenRouter") {
        headers["X-Title"] = "JepongDevxyz API Live Tester";
      }

      body = {
        model: config.model,
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
        body.max_tokens = 96;
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
      configured: true,
      provider: config.provider,
      model: config.model,
      resolvedModel: data?.model || null,
      httpStatus: response.status,
      latency,
      answer,
      raw: data
    });
  } catch (error) {
    const latency = Date.now() - started;

    return res.status(500).json({
      ok: false,
      configured: true,
      provider: config.provider,
      model: config.model,
      latency,
      httpStatus: 500,
      error:
        error?.name === "AbortError"
          ? "Request timed out after 30 seconds"
          : error?.message || "Unknown request error"
    });
  } finally {
    clearTimeout(timeout);
  }
};
