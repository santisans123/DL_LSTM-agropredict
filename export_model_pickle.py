"""
Export model LSTM Keras ke Pickle (.pkl).

Dipakai setelah training selesai agar aplikasi dapat memuat model siap inferensi
tanpa menjalankan training ulang.
"""

from __future__ import annotations

import json
import pickle
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from tensorflow import keras


ROOT = Path(__file__).resolve().parent
ARTIFACT_DIR = ROOT / "artefak_model"
KERAS_MODEL = ARTIFACT_DIR / "lstm_model_terbaik.keras"
PICKLE_MODEL = ARTIFACT_DIR / "lstm_model_terbaik.pkl"
CONFIG_FILE = ARTIFACT_DIR / "konfigurasi_model_final.json"


def remove_key_recursive(value, key_to_remove: str):
    if isinstance(value, dict):
        value.pop(key_to_remove, None)
        for child in value.values():
            remove_key_recursive(child, key_to_remove)
    elif isinstance(value, list):
        for child in value:
            remove_key_recursive(child, key_to_remove)


def make_compatible_keras_copy(source: Path) -> Path:
    temp = Path(tempfile.gettempdir()) / f"{source.stem}_compatible.keras"
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "config.json":
                config = json.loads(data.decode("utf-8"))
                remove_key_recursive(config, "quantization_config")
                data = json.dumps(config).encode("utf-8")
            zout.writestr(item, data)
    return temp


def main() -> None:
    if not KERAS_MODEL.exists():
        raise FileNotFoundError(f"Model Keras tidak ditemukan: {KERAS_MODEL}")

    compatible_model = make_compatible_keras_copy(KERAS_MODEL)
    model = keras.models.load_model(compatible_model, compile=False)
    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8")) if CONFIG_FILE.exists() else {}

    payload = {
        "format": "keras-model-pickle",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source_model": KERAS_MODEL.name,
        "purpose": "inference tanpa training ulang",
        "config": config,
        "model": model,
    }

    with open(PICKLE_MODEL, "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)

    size_mb = PICKLE_MODEL.stat().st_size / (1024 * 1024)
    print(f"Berhasil membuat {PICKLE_MODEL} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
