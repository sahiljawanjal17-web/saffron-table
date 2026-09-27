import modelsJson from '@/generated/models.json';

/** Registry generated from data_science/engine/model_config.py (npm run sync:models). */
export type EngineModel = {
  key: string;
  display_name: string;
  model_id: string;
  provider: string;
  category: string;
  is_free: boolean;
  cost_input_per_1m_inr: number;
  cost_output_per_1m_inr: number;
  context_window: number;
  default_max_tokens: number;
  purpose: string;
  role: string;
  backup_for?: string;
};

export const ENGINE_MODELS = modelsJson.models as EngineModel[];
export const OPENROUTER_BASE_URL = modelsJson.openrouterBaseUrl;
export const AI_CREDIT_BASE_URL = modelsJson.aiCreditBaseUrl;
export const ENGINE_BUDGET_INR = modelsJson.budgetLimitInr;
export const ENGINE_BUDGET_WARN_INR = modelsJson.budgetWarnAtInr;

/** Website features -> default model when the user picks "Auto". */
export const FEATURE_MODEL_MAP = {
  insights: 'free_reasoning_primary',
  assistant: 'free_reasoning_primary'
} as const;

export type AiFeature = keyof typeof FEATURE_MODEL_MAP;

export function getModel(key: string) {
  return ENGINE_MODELS.find((m) => m.key === key);
}

export function findBackup(key: string) {
  return ENGINE_MODELS.find((m) => m.backup_for === key);
}

/** Safe-to-send-to-browser model list (no secrets live here anyway). */
export function publicModelList() {
  return ENGINE_MODELS.map((m) => ({
    key: m.key,
    name: m.display_name,
    category: m.category,
    isFree: m.is_free,
    purpose: m.purpose,
    role: m.role,
    costIn: m.cost_input_per_1m_inr,
    costOut: m.cost_output_per_1m_inr
  }));
}

export type PublicModel = ReturnType<typeof publicModelList>[number];
