import type { ModelOption } from "@openuidev/react-ui";

export const DEFAULT_MODEL = "deepseek-chat";

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    group: "DeepSeek",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    group: "DeepSeek",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    group: "DeepSeek",
  },
];

const MODEL_IDS = new Set(MODEL_OPTIONS.map((model) => model.id));

export function resolveRequestedModel(
  model: unknown,
): string | null {
  if (model === undefined || model === null || model === "") {
    return DEFAULT_MODEL;
  }

  return typeof model === "string" && MODEL_IDS.has(model)
    ? model
    : null;
}
