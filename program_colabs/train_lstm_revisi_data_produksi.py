"""
Training LSTM revisi untuk dataset produksi gabungan yang sudah dibersihkan.

Pakai output dari:
  program_colabs/artefak_model/data_produksi_gabungan_clean.csv

Ciri utama:
- target memakai log1p untuk meredam lonjakan produksi,
- fitur produksi/lag/rolling di-scale dengan RobustScaler,
- model dua-head: regresi besaran produksi + klasifikasi apakah produksi > 0,
- artefak disimpan di `program_colabs/artefak_model/`.
"""

from __future__ import annotations

import json
import os
import pickle
import random
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

MPLCONFIGDIR = Path("/private/tmp/matplotlib")
MPLCONFIGDIR.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPLCONFIGDIR))

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.preprocessing import RobustScaler, StandardScaler
from tensorflow import keras
from tensorflow.keras import layers


ROOT = Path(__file__).resolve().parent
ARTIFACT_DIR = ROOT / "artefak_model"
CSV_CLEAN = ARTIFACT_DIR / "data_produksi_gabungan_clean.csv"

SEED = 42
TIMESTEP = 3
MIN_ACTUAL_FOR_MAPE = 1.0
FEATURE_SEQ = ["Produksi_kg", "lag1_produksi", "rolling3_produksi"]
FEATURE_EXTRA = ["bulan_sin", "bulan_cos"]

LEARNING_RATES = [0.001, 0.0005]
DROPOUTS = [0.2, 0.3]
UNITS = [32, 64]
LAYERS = [2, 3]


@dataclass(frozen=True)
class Candidate:
    learning_rate: float
    dropout: float
    units: int
    n_layer: int


def set_seed(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    keras.utils.set_random_seed(seed)


def load_clean() -> pd.DataFrame:
    df = pd.read_csv(CSV_CLEAN, parse_dates=["Periode"])
    df = df.sort_values(["Nama", "Periode"]).reset_index(drop=True)
    return df


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["bulan_sin"] = np.sin(2 * np.pi * out["Bulan_num"] / 12)
    out["bulan_cos"] = np.cos(2 * np.pi * out["Bulan_num"] / 12)
    out["lag1_produksi"] = out.groupby("Nama")["Produksi_kg"].shift(1)
    out["rolling3_produksi"] = out.groupby("Nama")["Produksi_kg"].transform(
        lambda s: s.shift(1).rolling(3).mean()
    )
    out = out.dropna().reset_index(drop=True)
    return out


def split_by_commodity(df: pd.DataFrame) -> pd.DataFrame:
    parts = []
    for nama, g in df.groupby("Nama"):
        g = g.sort_values("Periode").copy()
        n = len(g)
        n_train = max(1, int(n * 0.70))
        n_val = max(1, int(n * 0.15))
        g["split"] = "test"
        g.iloc[:n_train, g.columns.get_loc("split")] = "train"
        g.iloc[n_train:n_train + n_val, g.columns.get_loc("split")] = "val"
        parts.append(g)
    return pd.concat(parts).sort_values(["Nama", "Periode"]).reset_index(drop=True)


def fit_scalers(df: pd.DataFrame) -> tuple[RobustScaler, StandardScaler]:
    train = df[df["split"] == "train"]
    x_scaler = RobustScaler(quantile_range=(10, 90))
    y_scaler = StandardScaler()
    x_scaler.fit(np.log1p(train[FEATURE_SEQ]))
    y_scaler.fit(np.log1p(train[["Produksi_kg"]]))
    return x_scaler, y_scaler


def build_arrays(df: pd.DataFrame, x_scaler: RobustScaler, y_scaler: StandardScaler) -> dict[str, np.ndarray]:
    mapping = {nama: idx for idx, nama in enumerate(sorted(df["Nama"].unique()))}
    store = {k: [] for k in ["X_train", "K_train", "y_train", "b_train", "X_val", "K_val", "y_val", "b_val", "X_test", "K_test", "y_test", "b_test", "meta_train", "meta_val", "meta_test"]}

    for nama, g in df.groupby("Nama"):
        g = g.sort_values("Periode").copy()
        seq = x_scaler.transform(np.log1p(g[FEATURE_SEQ]))
        extra = g[FEATURE_EXTRA].to_numpy(dtype="float32")
        x_full = np.concatenate([seq, extra], axis=1)
        y_reg = y_scaler.transform(np.log1p(g[["Produksi_kg"]]))[:, 0]
        y_bin = (g["Produksi_kg"].to_numpy() > 0).astype("float32")
        kom_id = mapping[nama]

        for i in range(TIMESTEP, len(g)):
            split = g.iloc[i]["split"]
            x = x_full[i - TIMESTEP : i]
            if split == "train":
                suffix = "train"
            elif split == "val":
                suffix = "val"
            else:
                suffix = "test"
            store[f"X_{suffix}"].append(x)
            store[f"K_{suffix}"].append(kom_id)
            store[f"y_{suffix}"].append(y_reg[i])
            store[f"b_{suffix}"].append(y_bin[i])
            store[f"meta_{suffix}"].append(
                {
                    "Nama": nama,
                    "Periode": str(g.iloc[i]["Periode"].date()),
                    "split": suffix.title(),
                    "aktual": float(g.iloc[i]["Produksi_kg"]),
                }
            )

    arrays = {}
    for key, value in store.items():
        if key.startswith("meta_"):
            arrays[key] = np.asarray(value, dtype=object)
        else:
            dtype = "int32" if key.startswith("K_") else "float32"
            arrays[key] = np.asarray(value, dtype=dtype)
    arrays["n_komoditas"] = np.int32(len(mapping))
    return arrays


def build_model(input_shape: tuple[int, int], n_komoditas: int, params: Candidate) -> keras.Model:
    seq_in = keras.Input(shape=input_shape, name="sequence_input")
    kom_in = keras.Input(shape=(1,), dtype="int32", name="commodity_id")

    emb_dim = min(8, max(2, int(np.ceil(np.sqrt(n_komoditas)))))
    emb = layers.Embedding(n_komoditas, emb_dim)(kom_in)
    emb = layers.Flatten()(emb)
    emb = layers.RepeatVector(input_shape[0])(emb)

    x = layers.Concatenate()([seq_in, emb])
    for i in range(params.n_layer):
        return_sequences = i < params.n_layer - 1
        x = layers.LSTM(params.units, return_sequences=return_sequences)(x)
        x = layers.Dropout(params.dropout)(x)
    shared = layers.Dense(params.units, activation="relu")(x)
    reg = layers.Dense(1, name="reg")(shared)
    cls = layers.Dense(1, activation="sigmoid", name="cls")(shared)

    model = keras.Model([seq_in, kom_in], [reg, cls])
    model.compile(
        optimizer=keras.optimizers.Adam(params.learning_rate, clipnorm=1.0),
        loss={"reg": keras.losses.Huber(delta=0.75), "cls": "binary_crossentropy"},
        loss_weights={"reg": 1.0, "cls": 0.5},
    )
    return model


def inverse_target(y_scaled: np.ndarray, y_scaler: StandardScaler) -> np.ndarray:
    y_log = y_scaler.inverse_transform(np.asarray(y_scaled).reshape(-1, 1)).ravel()
    return np.expm1(y_log).clip(min=0)


def mape(actual: np.ndarray, pred: np.ndarray, eps: float = MIN_ACTUAL_FOR_MAPE) -> float:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    mask = actual >= eps
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((actual[mask] - pred[mask]) / actual[mask])) * 100)


def metrics(actual: np.ndarray, pred: np.ndarray) -> dict[str, float]:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    return {
        "MAPE(%)": mape(actual, pred),
        "RMSE(kg)": float(np.sqrt(np.mean((actual - pred) ** 2))),
        "R2": float(1 - np.sum((actual - pred) ** 2) / np.sum((actual - actual.mean()) ** 2)),
    }


def predict(model: keras.Model, arrays: dict[str, np.ndarray], split: str, y_scaler: StandardScaler) -> np.ndarray:
    reg, cls = model.predict([arrays[f"X_{split}"], arrays[f"K_{split}"]], verbose=0)
    y = inverse_target(reg.ravel(), y_scaler)
    return y * cls.ravel()


def candidate_grid() -> list[Candidate]:
    return [
        Candidate(0.001, 0.2, 64, 2),
        Candidate(0.001, 0.3, 64, 3),
        Candidate(0.001, 0.2, 32, 2),
        Candidate(0.0005, 0.2, 64, 2),
        Candidate(0.0005, 0.3, 64, 3),
        Candidate(0.0005, 0.3, 32, 2),
    ]


def save_artifacts(model: keras.Model, x_scaler: RobustScaler, y_scaler: StandardScaler, params: Candidate, config: dict) -> None:
    model.save(ARTIFACT_DIR / "lstm_model_revisi.keras")
    payload = {
        "format": "keras-model-pickle",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source_model": "lstm_model_revisi.keras",
        "purpose": "inference tanpa training ulang",
        "config": config,
        "preprocessing": {
            "x_scaler": x_scaler,
            "y_scaler": y_scaler,
            "features": FEATURE_SEQ + FEATURE_EXTRA,
            "target_transform": "log1p_standard",
        },
        "model": model,
        "best_params": asdict(params),
    }
    with open(ARTIFACT_DIR / "lstm_model_revisi.pkl", "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)


def save_loss_curve(history: dict, params: Candidate) -> None:
    if not history:
        return
    hist_df = pd.DataFrame(history)
    hist_df.to_csv(ARTIFACT_DIR / "history_lstm_revisi.csv", index=False)

    if "loss" not in hist_df.columns or "val_loss" not in hist_df.columns:
        return

    plt.figure(figsize=(10, 5))
    plt.plot(hist_df["loss"], label="Train Loss")
    plt.plot(hist_df["val_loss"], label="Val Loss")
    plt.title(
        f"Loss Training LSTM (units={params.units}, layer={params.n_layer}, dropout={params.dropout})"
    )
    plt.xlabel("Epoch")
    plt.ylabel("MSE (skala 0-1)")
    plt.legend()
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(ARTIFACT_DIR / "loss_lstm_revisi.png", dpi=160)
    plt.close()


def main() -> None:
    set_seed()
    df = add_features(load_clean())
    df = split_by_commodity(df)
    x_scaler, y_scaler = fit_scalers(df)
    arrays = build_arrays(df, x_scaler, y_scaler)

    rows = []
    best = {"score": float("inf"), "model": None, "params": None}
    best_history = None
    input_shape = arrays["X_train"].shape[1:]

    for params in candidate_grid():
        keras.backend.clear_session()
        model = build_model(input_shape, int(arrays["n_komoditas"]), params)
        callbacks = [
            keras.callbacks.EarlyStopping(monitor="val_loss", patience=6, restore_best_weights=True),
            keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5),
        ]
        hist = model.fit(
            [arrays["X_train"], arrays["K_train"]],
            {"reg": arrays["y_train"], "cls": arrays["b_train"]},
            validation_data=(
                [arrays["X_val"], arrays["K_val"]],
                {"reg": arrays["y_val"], "cls": arrays["b_val"]},
            ),
            epochs=40,
            batch_size=16,
            verbose=0,
            callbacks=callbacks,
        )
        val_pred = predict(model, arrays, "val", y_scaler)
        row = {
            **asdict(params),
            "epochs": len(hist.history["loss"]),
            "val_mape": mape(inverse_target(arrays["y_val"], y_scaler), val_pred),
            "val_rmse": metrics(inverse_target(arrays["y_val"], y_scaler), val_pred)["RMSE(kg)"],
        }
        rows.append(row)
        if row["val_mape"] < best["score"]:
            best = {"score": row["val_mape"], "model": model, "params": params}
            best_history = hist.history

    result_df = pd.DataFrame(rows).sort_values(["val_mape", "val_rmse"])
    result_df.to_csv(ARTIFACT_DIR / "hasil_tuning_lstm_revisi.csv", index=False)

    best_model = best["model"]
    assert best_model is not None
    eval_rows = []
    pred_rows = []
    for split, label in [("train", "Train"), ("val", "Validation"), ("test", "Test")]:
        actual = inverse_target(arrays[f"y_{split}"], y_scaler)
        pred = predict(best_model, arrays, split, y_scaler)
        eval_rows.append({"split": label, **metrics(actual, pred)})
        meta = pd.DataFrame(list(arrays[f"meta_{split}"]))
        meta["split"] = label
        meta["aktual"] = actual
        meta["prediksi"] = pred
        pred_rows.append(meta)

    eval_df = pd.DataFrame(eval_rows)
    eval_df.to_csv(ARTIFACT_DIR / "tabel_evaluasi_lstm_revisi.csv", index=False)
    pd.concat(pred_rows, ignore_index=True).to_csv(ARTIFACT_DIR / "hasil_prediksi_lstm_revisi.csv", index=False)

    config = {
        "timestep": TIMESTEP,
        "features": FEATURE_SEQ + FEATURE_EXTRA,
        "target": "Produksi_kg",
        "n_komoditas": int(arrays["n_komoditas"]),
        "selection_metric": "validation MAPE on positive actuals",
        "source_csv": CSV_CLEAN.name,
    }
    (ARTIFACT_DIR / "konfigurasi_lstm_revisi.json").write_text(
        json.dumps(config, indent=2), encoding="utf-8"
    )
    save_artifacts(best_model, x_scaler, y_scaler, best["params"], config)
    save_loss_curve(best_history, best["params"])

    print(eval_df.to_string(index=False))
    print("Artefak tersimpan di", ARTIFACT_DIR)


if __name__ == "__main__":
    main()
