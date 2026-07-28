"""
Model ensemble revisi untuk data produksi yang sudah dipreprocessing.

Kenapa ada file ini?
Hasil analisis menunjukkan LSTM dua-head pada data bersih masih kalah dari
baseline time-series sederhana. Karena tujuan revisi adalah menurunkan MAPE,
artefak ini memilih metode prediksi terbaik per komoditas berdasarkan validation
set, lalu mengevaluasinya pada test set.

Output disimpan di `program_colabs/artefak_model/`.
"""

from __future__ import annotations

import json
import pickle
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
ARTIFACT_DIR = ROOT / "artefak_model"
CSV_CLEAN = ARTIFACT_DIR / "data_produksi_gabungan_clean.csv"
TIMESTEP = 3
MIN_POSITIVE_OBSERVATIONS = 30


def mape(actual, pred, eps: float = 1.0) -> float:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    mask = actual >= eps
    if not np.any(mask):
        return float("nan")
    return float(np.mean(np.abs((actual[mask] - pred[mask]) / actual[mask])) * 100)


def rmse(actual, pred) -> float:
    return float(np.sqrt(np.mean((np.asarray(actual) - np.asarray(pred)) ** 2)))


def r2(actual, pred) -> float:
    actual = np.asarray(actual, dtype=float)
    pred = np.asarray(pred, dtype=float)
    denom = float(np.sum((actual - actual.mean()) ** 2))
    if denom == 0:
        return float("nan")
    return float(1 - np.sum((actual - pred) ** 2) / denom)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.sort_values(["Nama", "Periode"]).copy()
    summary = out.groupby("Nama")["Produksi_kg"].agg(
        positive=lambda s: int((s > 0).sum())
    )
    komoditas_aktif = summary[summary["positive"] >= MIN_POSITIVE_OBSERVATIONS].index
    out = out[out["Nama"].isin(komoditas_aktif)].copy()
    out["lag1"] = out.groupby("Nama")["Produksi_kg"].shift(1)
    out["rolling3"] = out.groupby("Nama")["Produksi_kg"].transform(
        lambda s: s.shift(1).rolling(TIMESTEP).mean()
    )
    out["last_nonzero"] = out.groupby("Nama")["Produksi_kg"].transform(
        lambda s: s.shift(1).replace(0, np.nan).ffill()
    )
    out = out.dropna(subset=["lag1", "rolling3"]).reset_index(drop=True)
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

        train = g[g["split"] == "train"]
        positive_train = train[train["Produksi_kg"] > 0]
        train_median_pos = positive_train["Produksi_kg"].median() if len(positive_train) else 0.0
        train_mean_pos = positive_train["Produksi_kg"].mean() if len(positive_train) else 0.0
        seasonal_all = train.groupby("Bulan_num")["Produksi_kg"].median()
        seasonal_pos = positive_train.groupby("Bulan_num")["Produksi_kg"].median()
        max_train = float(train["Produksi_kg"].max())

        g["seasonal_median"] = g["Bulan_num"].map(seasonal_all).fillna(train["Produksi_kg"].median())
        g["seasonal_pos_median"] = g["Bulan_num"].map(seasonal_pos).fillna(train_median_pos)
        g["train_median_pos"] = train_median_pos
        g["train_mean_pos"] = train_mean_pos
        g["blend_roll_season"] = 0.5 * g["rolling3"] + 0.5 * g["seasonal_pos_median"]
        g["blend_lag_roll"] = 0.5 * g["lag1"] + 0.5 * g["rolling3"]

        candidate_cols = [
            "lag1",
            "rolling3",
            "last_nonzero",
            "seasonal_median",
            "seasonal_pos_median",
            "train_median_pos",
            "train_mean_pos",
            "blend_roll_season",
            "blend_lag_roll",
        ]
        for col in candidate_cols:
            g[col] = g[col].fillna(0).clip(lower=0, upper=max_train * 1.2)
        parts.append(g)
    return pd.concat(parts).sort_values(["Nama", "Periode"]).reset_index(drop=True)


def predict_candidate(g: pd.DataFrame, method: str) -> np.ndarray:
    if method == "lag1":
        return g["lag1"].to_numpy(dtype=float)
    if method == "rolling3":
        return g["rolling3"].to_numpy(dtype=float)
    if method == "seasonal_median":
        return g["seasonal_median"].to_numpy(dtype=float)
    if method == "seasonal_pos_median":
        return g["seasonal_pos_median"].to_numpy(dtype=float)
    if method == "last_nonzero":
        return g["last_nonzero"].to_numpy(dtype=float)
    if method == "train_median_pos":
        return g["train_median_pos"].to_numpy(dtype=float)
    if method == "train_mean_pos":
        return g["train_mean_pos"].to_numpy(dtype=float)
    if method == "blend_roll_season":
        return g["blend_roll_season"].to_numpy(dtype=float)
    if method == "blend_lag_roll":
        return g["blend_lag_roll"].to_numpy(dtype=float)
    if method == "zero":
        return np.zeros(len(g), dtype=float)
    raise ValueError(f"Metode tidak dikenal: {method}")


def choose_methods(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    methods = [
        "lag1",
        "rolling3",
        "last_nonzero",
        "seasonal_median",
        "seasonal_pos_median",
        "train_median_pos",
        "train_mean_pos",
        "blend_roll_season",
        "blend_lag_roll",
        "zero",
    ]
    for nama, g in df.groupby("Nama"):
        val = g[g["split"] == "val"]
        scores = {
            method: mape(val["Produksi_kg"], predict_candidate(val, method))
            for method in methods
        }
        finite_scores = {method: score for method, score in scores.items() if not np.isnan(score)}
        best = min(finite_scores, key=finite_scores.get) if finite_scores else "seasonal_median"
        rows.append(
            {
                "Nama": nama,
                "metode_terpilih": best,
                "val_mape": scores[best],
                **{f"val_mape_{method}": score for method, score in scores.items()},
            }
        )
    return pd.DataFrame(rows)


def evaluate(df: pd.DataFrame, choices: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    choice_map = choices.set_index("Nama")["metode_terpilih"].to_dict()
    pred_rows = []
    for nama, g in df.groupby("Nama"):
        method = choice_map[nama]
        pred = predict_candidate(g, method)
        tmp = g[["Nama", "Periode", "split", "Produksi_kg"]].copy()
        tmp = tmp.rename(columns={"Produksi_kg": "aktual"})
        tmp["prediksi"] = pred
        tmp["metode"] = method
        pred_rows.append(tmp)
    pred_df = pd.concat(pred_rows, ignore_index=True)

    eval_rows = []
    for split, label in [("train", "Train"), ("val", "Validation"), ("test", "Test")]:
        sub = pred_df[pred_df["split"] == split]
        eval_rows.append(
            {
                "split": label,
                "MAPE(%)": mape(sub["aktual"], sub["prediksi"]),
                "RMSE(kg)": rmse(sub["aktual"], sub["prediksi"]),
                "R2": r2(sub["aktual"], sub["prediksi"]),
            }
        )
    return pd.DataFrame(eval_rows), pred_df


def main() -> None:
    df = pd.read_csv(CSV_CLEAN, parse_dates=["Periode"])
    df = split_by_commodity(add_features(df))
    choices = choose_methods(df)
    eval_df, pred_df = evaluate(df, choices)

    choices.to_csv(ARTIFACT_DIR / "pilihan_metode_ensemble_revisi.csv", index=False)
    eval_df.to_csv(ARTIFACT_DIR / "tabel_evaluasi_ensemble_revisi.csv", index=False)
    pred_df.to_csv(ARTIFACT_DIR / "hasil_prediksi_ensemble_revisi.csv", index=False)

    payload = {
        "format": "ensemble-baseline-revisi",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "source_csv": CSV_CLEAN.name,
        "min_positive_observations": MIN_POSITIVE_OBSERVATIONS,
        "timestep": TIMESTEP,
        "choices": choices.to_dict(orient="records"),
        "evaluasi_test": eval_df[eval_df["split"] == "Test"].iloc[0].to_dict(),
        "description": "Metode terbaik per komoditas dipilih dari validation set: lag1, rolling3, seasonal_median, atau zero.",
    }
    with open(ARTIFACT_DIR / "ensemble_model_revisi.pkl", "wb") as f:
        pickle.dump(payload, f, protocol=pickle.HIGHEST_PROTOCOL)
    (ARTIFACT_DIR / "konfigurasi_ensemble_revisi.json").write_text(
        json.dumps(payload, indent=2, default=str), encoding="utf-8"
    )

    print("=== Evaluasi Ensemble Revisi ===")
    print(eval_df.to_string(index=False))
    print("\nArtefak tersimpan di", ARTIFACT_DIR)


if __name__ == "__main__":
    main()
