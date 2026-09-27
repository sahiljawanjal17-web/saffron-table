"""
Export the model registry from data_science/engine/model_config.py to JSON so the
website uses exactly the same models (single source of truth).

ENGINE_DIR env var overrides the default engine location.
If the engine folder is missing (e.g. on a deploy server), the last generated
src/generated/models.json is kept as-is.
"""

import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENGINE = Path.home() / "OneDrive" / "data_science" / "engine"
ENGINE_DIR = Path(os.environ.get("ENGINE_DIR", DEFAULT_ENGINE))
OUT = ROOT / "src" / "generated" / "models.json"


def main():
    config_path = ENGINE_DIR / "model_config.py"
    if not config_path.exists():
        if OUT.exists():
            print(f"[sync:models] {config_path} not found - keeping existing {OUT.name}")
            return
        sys.exit(f"[sync:models] {config_path} not found and no models.json to fall back on")

    spec = importlib.util.spec_from_file_location("model_config", config_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    data = {
        "openrouterBaseUrl": module.OPENROUTER_BASE_URL,
        "aiCreditBaseUrl": getattr(module, "AI_CREDIT_BASE_URL", None),
        "budgetLimitInr": module.BUDGET_LIMIT_INR,
        "budgetWarnAtInr": module.BUDGET_WARN_AT_INR,
        "taskModelMap": module.TASK_MODEL_MAP,
        "models": [{"key": key, **model} for key, model in module.MODELS.items()],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    new_text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == new_text:
        print(f"[sync:models] {len(data['models'])} models - already up to date")
        return
    OUT.write_text(new_text, encoding="utf-8")
    print(f"[sync:models] wrote {len(data['models'])} models -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
