export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel:
    process.env.ANTHROPIC_MODEL ?? "claude-opus-4-5-20251101",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
