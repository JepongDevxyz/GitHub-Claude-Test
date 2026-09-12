const ALLOWED_MODELS = {
  "gpt-5.4": "openai",
  "gpt-5.4-mini": "openai",
  "gpt-5.4-nano": "openai",
  "gpt-5.3-codex": "openai",
  "gpt-5.3-instant": "openai",

  "claude-opus-4-7": "anthropic",
  "claude-sonnet-4-6": "anthropic",
  "claude-haiku-4-5": "anthropic"
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only"
    });
  }

  const { model } = req.body || {};

  if (!model || !ALLOWED_MODELS[model]) {
    return res.status(400).json({
      ok: false,
      error: "Invalid model"
    });
  }

  const provider = ALLOWED_MODELS[model];
  const started = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    let response;

    if (provider === "openai") {
      response = await fetch(
        "https://api.openapis.online/openai/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": "Bearer admin",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            stream: false,
            max_completion_tokens: 128,
            messages: [
              {
                role: "user",
                content:
                  "Reply with exactly one short sentence confirming you can respond."
              }
            ]
          })
        }
      );
    } else {
      response = await fetch(
        "https://api.openapis.online/anthropic/v1/messages",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "x-api-key": "admin",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            max_tokens: 128,
            stream: false,
            messages: [
              {
                role: "user",
                content:
                  "Reply with exactly one short sentence confirming you can respond."
              }
            ]
          })
        }
      );
    }

    const latency = Date.now() - started;
    const rawText = await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        raw: rawText
      };
    }

    let answer = null;

    if (provider === "openai") {
      answer =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        null;
    } else {
      answer =
        data?.content
          ?.filter(item => item.type === "text")
          ?.map(item => item.text)
          ?.join("") || null;
    }

    return res.status(response.ok ? 200 : response.status).json({
      ok: response.ok,
      provider,
      model,
      httpStatus: response.status,
      latency,
      answer,
      raw: data
    });
  } catch (error) {
    const latency = Date.now() - started;

    return res.status(500).json({
      ok: false,
      model,
      provider,
      latency,
      error:
        error.name === "AbortError"
          ? "Request timed out after 30 seconds"
          : error.message
    });
  } finally {
    clearTimeout(timeout);
  }
};
