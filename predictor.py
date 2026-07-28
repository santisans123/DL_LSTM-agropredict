"""
predictor.py  (versi 2)
=======================
Jembatan antara artefak model LSTM (hasil Google Colab) dan dashboard Streamlit.

Logika inti disalin persis dari notebook Bagian 9.2 (inverse transform per
komoditas) dan Bagian 17.2 (fungsi inferensi), supaya angka di dashboard
IDENTIK dengan angka di notebook/skripsi.

Baru di versi 2:
  * prediksi batch  -> 26 komoditas sekali panggil model (jauh lebih cepat)
  * backtest()      -> aktual vs prediksi bulan per bulan
  * override        -> simulasi "bagaimana jika" pada window input
  * kondisi_awal()  -> nilai wajar untuk mengisi form dashboard

Struktur folder yang diharapkan
-------------------------------
    remix_-agropredict-lstm-dashboard(2)/
    |-- app.py
    |-- predictor.py            <- file ini
    `-- artefak_model/          <- hasil ekstrak artefak_preprocessing.zip
        |-- lstm_model_terbaik.pkl    <- prioritas loader aplikasi
        |-- lstm_model_terbaik.keras   <- fallback / format asli Keras
        |-- scaler_per_komoditas.pkl
        |-- label_encoder.pkl
        |-- komoditas_mapping.json
        |-- konfigurasi_model_final.json
        |-- dataset_final_raw.csv
        `-- ...
"""

from __future__ import annotations

import json
import os
import pickle
import tempfile
import warnings
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
warnings.filterwarnings("ignore")

ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_ARTIFACT_DIR = ROOT_DIR / "program_colabs" / "artefak_model"
LEGACY_ARTIFACT_DIR = ROOT_DIR / "artefak_model"
MODEL_PICKLE_NAME = "lstm_model_terbaik.pkl"
MODEL_KERAS_NAME = "lstm_model_terbaik.keras"
REVISED_MODEL_PICKLE_NAMES = [
    "lstm_model_revisi.pkl",
    "lstm_model_terbaik_revisi.pkl",
]
REVISED_MODEL_KERAS_NAMES = [
    "lstm_model_revisi.keras",
    "lstm_model_terbaik_revisi.keras",
]
REVISED_CONFIG_NAMES = [
    "konfigurasi_lstm_revisi.json",
    "konfigurasi_hyperparameter_revisi.json",
]
REVISED_DATA_NAMES = [
    "data_produksi_gabungan_clean.csv",
    "data_produksi_gabungan_raw.csv",
]

BULAN_MAP = {
    "Januari": 1, "Februari": 2, "Maret": 3, "April": 4, "Mei": 5, "Juni": 6,
    "Juli": 7, "Agustus": 8, "September": 9, "Oktober": 10, "November": 11,
    "Desember": 12,
}
NAMA_BULAN = {v: k for k, v in BULAN_MAP.items()}
BULAN_SINGKAT = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
    7: "Jul", 8: "Agu", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
}

# Kolom mentah yang dipakai untuk mengisi nilai awal form dashboard
KOLOM_LAHAN = {
    "luasTanamAkhir": "Luas Tan Akhir",
    "luasPanenHabis": "Luas Panen Habis",
    "luasPanenBelumHabis": "Luas Panen Belum Habis",
    "luasRusak": "Luas Rusak",
    "luasTambahTanam": "Luas Tambah Tanam",
}


class PrediktorProduksi:
    """Memuat semua artefak sekali, lalu melayani permintaan prediksi."""

    # ------------------------------------------------------------------ init
    def __init__(self, artifact_dir: str | Path = DEFAULT_ARTIFACT_DIR):
        kandidat_dir = [Path(artifact_dir), DEFAULT_ARTIFACT_DIR, LEGACY_ARTIFACT_DIR]
        self.dir = next((p for p in kandidat_dir if p.exists()), Path(artifact_dir))
        if not self.dir.exists():
            raise FileNotFoundError(
                f"Folder artefak tidak ditemukan: {self.dir}\n"
                "Siapkan artefak model di folder program_colabs/artefak_model "
                "atau artefak_model."
            )

        self.config = self._baca_config()
        self.revised_pipeline = "features" in self.config and "features_dasar" not in self.config
        self.timestep = int(self.config["timestep"])
        self.features = list(self.config.get("features_dasar") or self.config.get("features") or [])
        self.features_sequence = list(self.config.get("features_sequence") or self.config.get("features") or self.features)
        self.target_idx = int(self.config.get("target_idx", 0))
        self.encoding = self.config.get("encoding_terpilih", "Embedding" if self.revised_pipeline else "Embedding")
        self.pakai_embedding = bool(self.config.get("pakai_embedding", True))
        self.n_komoditas = int(self.config.get("n_komoditas", 0))

        self.komoditas_mapping = self._baca_komoditas_mapping()
        self.id_to_nama = {int(v): k for k, v in self.komoditas_mapping.items()}
        self.label_encoder = self._baca_pickle("label_encoder.pkl", wajib=False)
        self.scaler_per_komoditas = self._baca_pickle("scaler_per_komoditas.pkl", wajib=False)
        self.onehot_encoder = self._baca_pickle("onehot_encoder.pkl", wajib=False)
        self.preprocessing_revisi = None
        self.ensemble_revisi = self._baca_pickle("ensemble_model_revisi.pkl", wajib=False)
        self.ensemble_choices = {}
        if isinstance(self.ensemble_revisi, dict):
            self.ensemble_choices = {
                row["Nama"]: row["metode_terpilih"]
                for row in self.ensemble_revisi.get("choices", [])
            }

        self.model = self._muat_model_lstm()
        if not self.komoditas_mapping:
            self.komoditas_mapping = {
                nama: idx for idx, nama in enumerate(sorted(self._muat_data_histori()["Nama"].unique()))
            }
            self.id_to_nama = {int(v): k for k, v in self.komoditas_mapping.items()}
        if self.ensemble_choices:
            self.komoditas_mapping = {
                nama: idx for idx, nama in enumerate(sorted(self.ensemble_choices.keys()))
            }
            self.id_to_nama = {int(v): k for k, v in self.komoditas_mapping.items()}
        if not self.n_komoditas:
            self.n_komoditas = len(self.komoditas_mapping)

        self.data = self._muat_data_histori()
        if "Produksi_kg" in self.data.columns:
            self.max_produksi_per_komoditas = (
                self.data.groupby("Nama")["Produksi_kg"].max().to_dict()
            )
        else:
            self.max_produksi_per_komoditas = {}

    # -------------------------------------------------------------- utilitas
    def _cari_berkas(self, kandidat: list[str], wajib: bool = True) -> Path | None:
        for nama in kandidat:
            path = self.dir / nama
            if path.exists():
                return path
        if wajib:
            raise FileNotFoundError(f"Artefak tidak ditemukan di {self.dir}: {kandidat}")
        return None

    def _baca_json(self, nama_file: str) -> dict:
        with open(self.dir / nama_file, encoding="utf-8") as f:
            return json.load(f)

    def _baca_config(self) -> dict:
        path = self._cari_berkas(REVISED_CONFIG_NAMES, wajib=False)
        if path is None:
            path = self.dir / "konfigurasi_model_final.json"
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _baca_komoditas_mapping(self) -> dict[str, int]:
        path = self._cari_berkas(["komoditas_mapping.json"], wajib=False)
        if path and path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _baca_pickle(self, nama_file: str, wajib: bool = True):
        path = self.dir / nama_file
        if not path.exists():
            if wajib:
                raise FileNotFoundError(f"Artefak wajib tidak ada: {path}")
            return None
        with open(path, "rb") as f:
            return pickle.load(f)

    def _muat_data_histori(self) -> pd.DataFrame:
        if self.revised_pipeline:
            path = self._cari_berkas(REVISED_DATA_NAMES, wajib=False)
            if path is None:
                path = self.dir / "dataset_final_raw.csv"
        else:
            path = self._cari_berkas(["dataset_final_raw.csv"], wajib=False)
            if path is None:
                path = self._cari_berkas(REVISED_DATA_NAMES, wajib=False)
        if path is None:
            raise FileNotFoundError("Dataset historis tidak ditemukan.")

        df = pd.read_csv(path)
        if "Periode" in df.columns:
            df["Periode"] = pd.to_datetime(df["Periode"])
        if "Nama Komoditas" in df.columns and "Nama" not in df.columns:
            df = df.rename(columns={"Nama Komoditas": "Nama"})
        if "Bulan_num" not in df.columns and "Bulan" in df.columns:
            df["Bulan_num"] = df["Bulan"].map(BULAN_MAP)
        if "Produksi_kg" not in df.columns and {"Produksi Habis (Kw)", "Produksi Belum Habis (Kw)"}.issubset(df.columns):
            df["Produksi_kg"] = (df["Produksi Habis (Kw)"] + df["Produksi Belum Habis (Kw)"]) * 100
        if self.revised_pipeline:
            if "bulan_sin" not in df.columns and "Bulan_num" in df.columns:
                df["bulan_sin"] = np.sin(2 * np.pi * df["Bulan_num"] / 12)
            if "bulan_cos" not in df.columns and "Bulan_num" in df.columns:
                df["bulan_cos"] = np.cos(2 * np.pi * df["Bulan_num"] / 12)
            if "lag1_produksi" not in df.columns:
                df = df.sort_values(["Nama", "Periode"]).reset_index(drop=True)
                df["lag1_produksi"] = df.groupby("Nama")["Produksi_kg"].shift(1)
                df["rolling3_produksi"] = df.groupby("Nama")["Produksi_kg"].transform(
                    lambda s: s.shift(1).rolling(3).mean()
                )
                df = df.dropna(subset=["lag1_produksi", "rolling3_produksi"]).reset_index(drop=True)
        return df.sort_values(["Nama", "Periode"]).reset_index(drop=True)

    def _muat_model_lstm(self):
        """
        Memuat model LSTM siap inferensi.

        Prioritas pertama adalah file Pickle (.pkl), sesuai kebutuhan aplikasi
        agar model hasil training bisa langsung dipanggil tanpa training ulang.
        File .keras tetap didukung sebagai fallback bila artefak .pkl belum ada.
        """
        pkl_path = self._cari_berkas(REVISED_MODEL_PICKLE_NAMES, wajib=False)
        if pkl_path is None:
            pkl_path = self._cari_berkas([MODEL_PICKLE_NAME], wajib=False)
        if pkl_path.exists():
            with open(pkl_path, "rb") as f:
                artefak = pickle.load(f)
            if isinstance(artefak, dict):
                self.preprocessing_revisi = artefak.get("preprocessing")
                if artefak.get("config"):
                    self.config.update(artefak["config"])
                if artefak.get("best_params"):
                    self.config["best_params"] = artefak["best_params"]
                if "model" in artefak:
                    return artefak["model"]
            return artefak

        from tensorflow import keras  # import lazy supaya startup ringan

        revised_preprocessing_path = self._cari_berkas(["preprocessing_lstm_revisi.pkl"], wajib=False)
        if revised_preprocessing_path and revised_preprocessing_path.exists():
            with open(revised_preprocessing_path, "rb") as f:
                self.preprocessing_revisi = pickle.load(f)

        model_path = self._cari_berkas(REVISED_MODEL_KERAS_NAMES, wajib=False)
        if model_path is None:
            model_path = self._cari_berkas([MODEL_KERAS_NAME], wajib=True)
        try:
            return keras.models.load_model(model_path, compile=False)
        except TypeError as exc:
            if "quantization_config" not in str(exc):
                raise
            return keras.models.load_model(
                self._salin_keras_tanpa_quantization_config(model_path),
                compile=False,
            )

    @staticmethod
    def _hapus_key_recursive(value, key_to_remove: str) -> None:
        if isinstance(value, dict):
            value.pop(key_to_remove, None)
            for child in value.values():
                PrediktorProduksi._hapus_key_recursive(child, key_to_remove)
        elif isinstance(value, list):
            for child in value:
                PrediktorProduksi._hapus_key_recursive(child, key_to_remove)

    def _salin_keras_tanpa_quantization_config(self, source: Path) -> Path:
        target = Path(tempfile.gettempdir()) / f"{source.stem}_compatible.keras"
        with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
            target, "w", compression=zipfile.ZIP_DEFLATED
        ) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "config.json":
                    config = json.loads(data.decode("utf-8"))
                    self._hapus_key_recursive(config, "quantization_config")
                    data = json.dumps(config).encode("utf-8")
                zout.writestr(item, data)
        return target

    @property
    def daftar_komoditas(self) -> list[str]:
        """26 komoditas yang dikenali model, urut abjad."""
        return sorted(self.komoditas_mapping.keys())

    def _cek_komoditas(self, nama: str) -> None:
        if nama not in self.komoditas_mapping:
            raise ValueError(
                f'Komoditas "{nama}" tidak dikenali model. '
                f"Pilihan yang tersedia: {self.daftar_komoditas}"
            )

    # ------------------------------------------------------------- histori
    def riwayat(self, nama: str) -> pd.DataFrame:
        """Histori bulanan 1 komoditas (skala asli / kg), urut kronologis."""
        self._cek_komoditas(nama)
        kolom = (
            ["Periode", "Tahun", "Bulan", "Nama", "split"]
            + self.features
            + list(KOLOM_LAHAN.values())
            + ["Harga Jual Petani (Rp/Kg)"]
        )
        sub = self.data[self.data["Nama"] == nama].sort_values("Periode")
        ada = [c for c in dict.fromkeys(kolom) if c in sub.columns]
        if self.revised_pipeline:
            kolom_revisi = ["Periode", "Tahun", "Bulan", "Nama", "split", "Produksi_kg", "Luas_Panen_ha", "Bulan_num", "bulan_sin", "bulan_cos", "lag1_produksi", "rolling3_produksi"]
            ada = [c for c in dict.fromkeys(kolom_revisi) if c in sub.columns]
        return sub[ada].reset_index(drop=True)

    def kondisi_awal(self, nama: str) -> dict:
        """
        Nilai awal untuk form dashboard = rata-rata KONDISI 3 BULAN TERAKHIR,
        yaitu persis jendela waktu yang dibaca model untuk menebak bulan depan.

        Ini penting: karena nilainya sama dengan kondisi nyata, prediksi saat
        form belum diutak-atik akan sama persis dengan prediksi dasar model.
        """
        h = self.riwayat(nama)
        jendela = h.tail(self.timestep)
        panen = h[h["Produksi_kg"] > 0]
        acuan_harga = panen if len(panen) else h

        out = {}
        if self.revised_pipeline:
            out["luasPanen"] = round(float(jendela["Luas_Panen_ha"].mean()), 1) if "Luas_Panen_ha" in jendela else 0.0
            out["pupuk"] = 0.0
            out["suhuAvg"] = 0.0
            out["curahHujan"] = 0.0
            out["mediaTanam"] = "Tanah"
            out["hargaJual"] = 0.0
            out["produksiRata"] = round(float(acuan_harga["Produksi_kg"].mean()), 1) if "Produksi_kg" in acuan_harga else 0.0
            return out

        for key, kolom in KOLOM_LAHAN.items():
            out[key] = round(float(jendela[kolom].mean()), 1) if kolom in jendela else 0.0

        out["luasPanen"] = round(float(jendela["Luas_Panen_ha"].mean()), 1)
        out["pupuk"] = float(h["Total_Pupuk_Kg"].iloc[-1])
        out["suhuAvg"] = round(float(jendela["Suhu_Rata"].mean()), 1)
        out["curahHujan"] = round(float(jendela["Curah_Hujan"].mean()), 1)
        out["mediaTanam"] = "Tanah"

        kol_harga = "Harga Jual Petani (Rp/Kg)"
        harga = (
            acuan_harga[kol_harga][acuan_harga[kol_harga] > 0]
            if kol_harga in acuan_harga
            else []
        )
        out["hargaJual"] = float(harga.iloc[-1]) if len(harga) else 0.0
        out["produksiRata"] = round(float(acuan_harga["Produksi_kg"].mean()), 1)
        return out

    # -------------------------------------------------------- inti prediksi
    def _prediksi_ensemble_window(self, window: pd.DataFrame, nama: str) -> float:
        method = self.ensemble_choices.get(nama, "rolling3")
        produksi = window["Produksi_kg"].astype(float)
        if method == "lag1":
            return float(max(produksi.iloc[-1], 0.0))
        if method == "rolling3":
            return float(max(produksi.tail(self.timestep).mean(), 0.0))
        if method == "seasonal_median":
            periode_target = window["Periode"].iloc[-1] + pd.DateOffset(months=1)
            hist = self.data[(self.data["Nama"] == nama) & (self.data["Periode"] < periode_target)]
            if "Bulan_num" in hist.columns:
                seasonal = hist[hist["Bulan_num"] == periode_target.month]["Produksi_kg"]
            else:
                seasonal = hist[hist["Periode"].dt.month == periode_target.month]["Produksi_kg"]
            acuan = seasonal[seasonal > 0]
            if len(acuan):
                return float(acuan.median())
            positif = hist["Produksi_kg"][hist["Produksi_kg"] > 0]
            return float(positif.median()) if len(positif) else 0.0
        if method == "zero":
            return 0.0
        return float(max(produksi.tail(self.timestep).mean(), 0.0))

    def _siapkan_input(self, window: pd.DataFrame, nama: str):
        """Ubah 1 window (skala asli) jadi array siap masuk model."""
        kom_id = int(self.komoditas_mapping.get(nama, 0))

        if self.revised_pipeline:
            cols = [c for c in self.features if c in window.columns]
            df_model = window[cols].astype(float).copy()
            return df_model[self.features].values, kom_id, None

        sc = self.scaler_per_komoditas[nama]
        if self.preprocessing_revisi:
            prep = self.preprocessing_revisi
            fitur = list(prep.get("features", self.features))
            log_features = set(prep.get("log_features", []))
            df_model = window[fitur].astype(float).copy()
            for col in log_features:
                if col in df_model:
                    df_model[col] = np.log1p(np.clip(df_model[col], a_min=0, a_max=None))
            arr = prep["x_scaler"].transform(df_model)
            return arr, kom_id, sc

        df_scaled = pd.DataFrame(
            sc.transform(window[self.features]), columns=self.features
        )

        if self.encoding == "Label Encoding":
            df_scaled["komoditas_id"] = kom_id / max(self.n_komoditas - 1, 1)
            kolom_urut = self.features + ["komoditas_id"]
        elif self.encoding == "One-Hot Encoding":
            oh = self.onehot_encoder.transform([[nama]])[0]
            oh_cols = [f"komoditas_oh_{c}" for c in self.onehot_encoder.categories_[0]]
            for col, val in zip(oh_cols, oh):
                df_scaled[col] = val
            kolom_urut = self.features + oh_cols
        else:  # Embedding -> identitas lewat input kedua
            kolom_urut = self.features

        return df_scaled[kolom_urut].values, kom_id, sc

    def _prediksi_batch(self, daftar: list[tuple[pd.DataFrame, str]]) -> list[float]:
        """
        Prediksi banyak window sekaligus dalam SATU panggilan model.
        Ini yang membuat papan peringkat 26 komoditas tetap responsif.
        """
        if not daftar:
            return []

        if self.ensemble_choices:
            return [self._prediksi_ensemble_window(window, nama) for window, nama in daftar]

        X_list, K_list, scaler_list = [], [], []
        for window, nama in daftar:
            self._cek_komoditas(nama)
            if len(window) != self.timestep:
                raise ValueError(
                    f"Window harus {self.timestep} baris, diterima {len(window)}."
                )
            arr, kom_id, sc = self._siapkan_input(window, nama)
            X_list.append(arr)
            K_list.append([kom_id])
            scaler_list.append(sc)

        X = np.asarray(X_list, dtype="float32")
        if self.pakai_embedding:
            K = np.asarray(K_list, dtype="int32")
            pred_scaled = self.model.predict([X, K], verbose=0)
        else:
            pred_scaled = self.model.predict(X, verbose=0)
        if isinstance(pred_scaled, (list, tuple)) and len(pred_scaled) >= 1:
            pred_reg = np.asarray(pred_scaled[0]).flatten()
            pred_cls = np.asarray(pred_scaled[1]).flatten() if len(pred_scaled) > 1 else np.ones_like(pred_reg)
        else:
            pred_reg = np.asarray(pred_scaled).flatten()
            pred_cls = np.ones_like(pred_reg)

        hasil = []
        for i, sc in enumerate(scaler_list):
            if self.revised_pipeline:
                if self.preprocessing_revisi:
                    y_scaler = self.preprocessing_revisi["y_scaler"]
                    y_log = y_scaler.inverse_transform([[pred_reg[i]]])[0, 0]
                    nilai = float(max(np.expm1(y_log), 0.0))
                else:
                    nilai = float(max(pred_reg[i], 0.0))
                if float(pred_cls[i]) < 0.5:
                    nilai = 0.0
                batas = float(self.max_produksi_per_komoditas.get(nama, 0.0))
                if batas > 0:
                    nilai = float(np.clip(nilai, 0.0, batas * 1.2))
                hasil.append(nilai)
                continue
            if self.preprocessing_revisi:
                y_scaler = self.preprocessing_revisi["y_scaler"]
                y_log = y_scaler.inverse_transform([[pred_reg[i]]])[0, 0]
                hasil.append(float(max(np.expm1(y_log), 0.0)))
                continue
            dummy = np.zeros((1, len(self.features)))
            dummy[0, self.target_idx] = pred_reg[i]
            nilai = sc.inverse_transform(dummy)[0, self.target_idx]
            hasil.append(float(max(nilai, 0.0)))
        return hasil

    def prediksi_dari_window(self, window: pd.DataFrame, nama: str) -> float:
        """Prediksi 1 bulan dari 1 window berisi `timestep` baris skala asli."""
        return self._prediksi_batch([(window, nama)])[0]

    def prediksi_bulan_berikutnya(self, nama: str, override: dict | None = None) -> dict:
        """Prediksi 1 bulan ke depan berdasarkan 3 bulan terakhir di dataset."""
        hist = self.riwayat(nama)
        window = self._window_dengan_override(hist, override)
        periode = hist["Periode"].max() + pd.DateOffset(months=1)
        return {
            "nama": nama,
            "periode": periode,
            "bulan": NAMA_BULAN[periode.month],
            "bulan_singkat": BULAN_SINGKAT[periode.month],
            "tahun": int(periode.year),
            "prediksi_kg": self.prediksi_dari_window(window, nama),
            "basis_periode": [str(d.date()) for d in window["Periode"]]
            if "Periode" in window
            else [],
        }

    def _window_dengan_override(
        self, hist: pd.DataFrame, override: dict | None
    ) -> pd.DataFrame:
        """Ambil 3 baris terakhir, lalu timpa fitur tertentu bila diminta."""
        window = hist.tail(self.timestep).copy()
        if override:
            for kolom, nilai in override.items():
                if kolom in self.features and nilai is not None:
                    window[kolom] = float(nilai)
        return window

    # ----------------------------------------------- ramalan banyak bulan
    def _baris_lanjutan(
        self, kerja: pd.DataFrame, pred: float, rata_per_bulan: pd.DataFrame,
        pupuk: float, faktor: dict | None,
    ) -> dict:
        """Bentuk baris fitur untuk bulan berikutnya dari hasil prediksi."""
        periode_baru = kerja["Periode"].iloc[-1] + pd.DateOffset(months=1)
        bln = periode_baru.month
        if self.revised_pipeline:
            tiga_terakhir = kerja["Produksi_kg"].tail(3).tolist()
            baris = {
                "Periode": periode_baru,
                "Produksi_kg": pred,
                "Bulan_num": bln,
                "bulan_sin": float(np.sin(2 * np.pi * bln / 12)),
                "bulan_cos": float(np.cos(2 * np.pi * bln / 12)),
                "lag1_produksi": float(tiga_terakhir[-1]),
                "rolling3_produksi": float(np.mean(tiga_terakhir)),
            }
            return baris

        acuan = (
            rata_per_bulan.loc[bln]
            if bln in rata_per_bulan.index
            else rata_per_bulan.mean()
        )
        tiga_terakhir = kerja["Produksi_kg"].tail(3).tolist()

        baris = {
            "Periode": periode_baru,
            "Produksi_kg": pred,
            "Luas_Panen_ha": float(acuan["Luas_Panen_ha"]),
            "Suhu_Rata": float(acuan["Suhu_Rata"]),
            "Curah_Hujan": float(acuan["Curah_Hujan"]),
            "Total_Pupuk_Kg": pupuk,
            "bulan_sin": float(np.sin(2 * np.pi * bln / 12)),
            "bulan_cos": float(np.cos(2 * np.pi * bln / 12)),
            "lag1_produksi": float(tiga_terakhir[-1]),
            "rolling3_produksi": float(np.mean(tiga_terakhir)),
        }
        # Skenario pengguna ikut diterapkan ke bulan-bulan yang diramalkan,
        # supaya "bagaimana jika" berlaku konsisten sampai akhir ramalan.
        return self._terapkan_faktor(baris, faktor or {})

    def prediksi_n_bulan(
        self, nama: str, n_bulan: int = 6, override: dict | None = None
    ) -> pd.DataFrame:
        """
        Ramalan beberapa bulan ke depan secara rekursif: hasil prediksi bulan
        ini dipakai jadi input bulan berikutnya.

        Asumsi untuk bulan yang belum terjadi (tulis ini di Bab IV skripsi):
          * Suhu, curah hujan, luas panen -> RATA-RATA bulan kalender yang sama
            dari seluruh histori komoditas tersebut (pendekatan klimatologis).
          * Total pupuk -> tetap, karena memang konstan per komoditas.
          * lag1 & rolling3 -> dihitung ulang dari rangkaian prediksi sebelumnya.

        `override` memaksa fitur tertentu bernilai tetap di semua langkah,
        dipakai untuk simulasi skenario dari form dashboard.
        """
        hasil = self.prediksi_n_bulan_banyak([nama], n_bulan, {nama: override or {}})
        return hasil[nama]

    def prediksi_n_bulan_banyak(
        self,
        daftar_nama: list[str],
        n_bulan: int = 3,
        override_per_nama: dict[str, dict] | None = None,
    ) -> dict[str, pd.DataFrame]:
        """
        Versi batch dari prediksi_n_bulan: seluruh komoditas maju bersamaan,
        sehingga model hanya dipanggil `n_bulan` kali (bukan sekali per
        komoditas per bulan). Inilah yang dipakai papan peringkat dashboard.
        """
        override_per_nama = override_per_nama or {}
        kerja, profil, pupuk, faktor_nama = {}, {}, {}, {}

        for nama in daftar_nama:
            self._cek_komoditas(nama)
            hist = self.riwayat(nama)
            faktor = self.hitung_faktor(nama, override_per_nama.get(nama) or {})
            faktor_nama[nama] = faktor

            if self.revised_pipeline:
                w = hist[["Periode", "Produksi_kg", "Bulan_num", "bulan_sin", "bulan_cos", "lag1_produksi", "rolling3_produksi"]].copy()
                w[["Produksi_kg", "bulan_sin", "bulan_cos", "lag1_produksi", "rolling3_produksi"]] = w[["Produksi_kg", "bulan_sin", "bulan_cos", "lag1_produksi", "rolling3_produksi"]].astype(float)
                kerja[nama] = w
                profil[nama] = pd.DataFrame()
                pupuk[nama] = 0.0
                continue

            w = hist[self.features + ["Periode"]].copy()
            w[self.features] = w[self.features].astype(float)

            if faktor:  # skenario diterapkan pada 3 baris terakhir (titik awal)
                idx = w.index[-self.timestep:]
                for kolom, (jenis, nilai) in faktor.items():
                    if kolom not in w.columns:
                        continue
                    if jenis == "ratio":
                        w.loc[idx, kolom] = w.loc[idx, kolom] * nilai
                    elif jenis == "shift":
                        w.loc[idx, kolom] = w.loc[idx, kolom] + nilai
                    else:
                        w.loc[idx, kolom] = nilai
            kerja[nama] = w

            prof = hist.copy()
            prof["bln"] = prof["Periode"].dt.month
            profil[nama] = prof.groupby("bln")[
                ["Luas_Panen_ha", "Suhu_Rata", "Curah_Hujan"]
            ].mean()
            pupuk[nama] = float(hist["Total_Pupuk_Kg"].iloc[-1])

        keluaran = {nama: [] for nama in daftar_nama}

        for langkah in range(1, n_bulan + 1):
            batch = [(kerja[n].tail(self.timestep), n) for n in daftar_nama]
            prediksi = self._prediksi_batch(batch)

            for nama, pred in zip(daftar_nama, prediksi):
                baris = self._baris_lanjutan(
                    kerja[nama], pred, profil.get(nama, pd.DataFrame()), pupuk.get(nama, 0.0), faktor_nama[nama],
                )
                kerja[nama] = pd.concat(
                    [kerja[nama], pd.DataFrame([baris])], ignore_index=True
                )
                periode = baris["Periode"]
                keluaran[nama].append(
                    {
                        "Periode": periode,
                        "Tahun": int(periode.year),
                        "Bulan": NAMA_BULAN[periode.month],
                        "Bulan_Singkat": BULAN_SINGKAT[periode.month],
                        "Prediksi_kg": pred,
                        "Prediksi_ton": pred / 1000,
                        "Langkah_ke": langkah,
                    }
                )

        return {nama: pd.DataFrame(rows) for nama, rows in keluaran.items()}

    # ------------------------------------------------- skenario / what-if
    def hitung_faktor(self, nama: str, target: dict) -> dict:
        if self.revised_pipeline:
            return {}

        """
        Ubah nilai yang diisi pengguna menjadi faktor perubahan terhadap kondisi
        nyata 3 bulan terakhir — BUKAN menimpa mentah-mentah.

        Alasannya: window 3 bulan punya bentuk naik-turun yang justru dipelajari
        model. Kalau ketiganya ditimpa satu angka yang sama, bentuk itu hilang
        dan prediksi bisa melompat jauh. Dengan cara ini:
          * luas panen & curah hujan -> diskalakan proporsional
          * suhu                     -> digeser sebesar selisihnya
          * pupuk                    -> diisi langsung (memang tetap sepanjang tahun)
        Kalau isian sama dengan kondisi sekarang, faktornya netral sehingga
        hasilnya persis sama dengan prediksi dasar.
        """
        jendela = self.riwayat(nama).tail(self.timestep)
        faktor: dict[str, tuple[str, float]] = {}

        for kolom, nilai in (
            ("Luas_Panen_ha", target.get("Luas_Panen_ha")),
            ("Curah_Hujan", target.get("Curah_Hujan")),
        ):
            if nilai is None:
                continue
            sekarang = float(jendela[kolom].mean())
            faktor[kolom] = (
                ("ratio", float(nilai) / sekarang) if sekarang > 0
                else ("abs", float(nilai))
            )

        if target.get("Suhu_Rata") is not None:
            sekarang = float(jendela["Suhu_Rata"].mean())
            faktor["Suhu_Rata"] = ("shift", float(target["Suhu_Rata"]) - sekarang)

        if target.get("Total_Pupuk_Kg") is not None:
            faktor["Total_Pupuk_Kg"] = ("abs", float(target["Total_Pupuk_Kg"]))

        return faktor

    @staticmethod
    def _terapkan_faktor(data, faktor: dict):
        """Terapkan faktor ke DataFrame window atau ke satu baris (dict)."""
        if not faktor:
            return data
        if isinstance(data, dict):
            for kolom, (jenis, nilai) in faktor.items():
                if kolom not in data:
                    continue
                if jenis == "ratio":
                    data[kolom] = float(data[kolom]) * nilai
                elif jenis == "shift":
                    data[kolom] = float(data[kolom]) + nilai
                else:
                    data[kolom] = nilai
            return data

        data = data.copy()
        for kolom, (jenis, nilai) in faktor.items():
            if kolom not in data.columns:
                continue
            if jenis == "ratio":
                data[kolom] = data[kolom] * nilai
            elif jenis == "shift":
                data[kolom] = data[kolom] + nilai
            else:
                data[kolom] = nilai
        return data

    def prediksi_skenario(
        self,
        nama: str,
        suhu: float | None = None,
        curah_hujan: float | None = None,
        luas_panen: float | None = None,
        pupuk: float | None = None,
    ) -> float:
        """
        Simulasi "bagaimana jika" pada kondisi 3 bulan terakhir.

        Catatan untuk sidang: model membaca kondisi 3 bulan TERAKHIR, bukan
        ramalan cuaca bulan depan. Jadi isian ini berarti "seandainya kondisi
        3 bulan terakhir seperti ini", bukan prakiraan cuaca ke depan.
        """
        if self.revised_pipeline:
            return self.prediksi_bulan_berikutnya(nama)["prediksi_kg"]

        faktor = self.hitung_faktor(
            nama,
            {
                "Suhu_Rata": suhu,
                "Curah_Hujan": curah_hujan,
                "Luas_Panen_ha": luas_panen,
                "Total_Pupuk_Kg": pupuk,
            },
        )
        jendela = self._terapkan_faktor(self.riwayat(nama).tail(self.timestep), faktor)
        return self.prediksi_dari_window(jendela, nama)

    # ------------------------------------------------------------ backtest
    def backtest(self, nama: str, n_terakhir: int = 6) -> pd.DataFrame:
        """
        Aktual vs prediksi bulan per bulan (one-step-ahead) pada data yang
        sudah terjadi. Untuk tiap bulan t, model diberi window aktual
        [t-3, t-2, t-1] lalu diminta menebak bulan t — sama persis dengan
        cara notebook mengevaluasi test set.
        """
        return self.backtest_banyak([nama], n_terakhir)[nama]

    def backtest_banyak(
        self, daftar_nama: list[str], n_terakhir: int = 6
    ) -> dict[str, pd.DataFrame]:
        """Versi batch dari backtest() untuk banyak komoditas sekaligus."""
        tugas, meta = [], []
        for nama in daftar_nama:
            hist = self.riwayat(nama).reset_index(drop=True)
            mulai = max(self.timestep, len(hist) - n_terakhir)
            for t in range(mulai, len(hist)):
                tugas.append((hist.iloc[t - self.timestep:t], nama))
                meta.append((nama, hist.iloc[t]))

        prediksi = self._prediksi_batch(tugas)

        kumpulan = {nama: [] for nama in daftar_nama}
        for (nama, baris), pred in zip(meta, prediksi):
            periode = baris["Periode"]
            aktual = float(baris["Produksi_kg"])
            kumpulan[nama].append(
                {
                    "Periode": periode,
                    "Bulan": BULAN_SINGKAT[periode.month],
                    "Label": f"{BULAN_SINGKAT[periode.month]} {periode.year}",
                    "aktual": aktual,
                    "prediksi": pred,
                    "selisih": aktual - pred,
                    "Suhu_Rata": float(baris["Suhu_Rata"]) if "Suhu_Rata" in baris else np.nan,
                    "Curah_Hujan": float(baris["Curah_Hujan"]) if "Curah_Hujan" in baris else np.nan,
                    "split": baris.get("split", ""),
                }
            )
        return {nama: pd.DataFrame(rows) for nama, rows in kumpulan.items()}

    # ------------------------------------------------------ tabel evaluasi
    def metrik_test(self) -> dict:
        """Metrik ringkas seluruh model untuk kartu KPI."""
        ev = self.config.get("evaluasi_test", {})
        if isinstance(self.ensemble_revisi, dict) and self.ensemble_revisi.get("evaluasi_test"):
            ev = self.ensemble_revisi["evaluasi_test"]
        if not ev:
            path = self._cari_berkas(["tabel_evaluasi_ensemble_revisi.csv", "tabel_evaluasi_lstm_revisi.csv", "tabel_evaluasi_final.csv"], wajib=False)
            if path is not None:
                ev_df = pd.read_csv(path)
                test_row = ev_df[ev_df["split"].str.lower() == "test"].iloc[0].to_dict()
                ev = test_row
        return {
            "MAPE": float(ev.get("MAPE(%)", np.nan)),
            "MedianMAPE": float(ev.get("MedianMAPE(%)", np.nan)),
            "RMSE": float(ev.get("RMSE(kg)", np.nan)),
            "R2": float(ev.get("R2", np.nan)),
        }

    def metrik_per_komoditas(self) -> pd.DataFrame:
        """
        MAPE & RMSE tiap komoditas, dihitung dari test set (hasil_prediksi_test.csv)
        — angka yang sama dengan Bab IV notebook.

        Komoditas yang seluruh nilai aktualnya nol di test set tidak punya MAPE
        (pembagian nol), ditandai lewat kolom `mape_tersedia`.
        """
        df = pd.read_csv(self.dir / "hasil_prediksi_test.csv")
        median_global = self.metrik_test()["MedianMAPE"]

        baris = []
        for nama, g in df.groupby("Nama"):
            mask = g["aktual"] > 1e-6
            mape = (
                float(
                    np.mean(
                        np.abs(
                            (g.loc[mask, "aktual"] - g.loc[mask, "prediksi"])
                            / g.loc[mask, "aktual"]
                        )
                    )
                    * 100
                )
                if mask.sum()
                else np.nan
            )
            rmse = float(np.sqrt(np.mean((g["aktual"] - g["prediksi"]) ** 2)))
            baris.append(
                {
                    "Nama": nama,
                    "MAPE": median_global if np.isnan(mape) else mape,
                    "MAPE_asli": mape,
                    "mape_tersedia": not np.isnan(mape),
                    "RMSE": rmse,
                    "n_uji": int(len(g)),
                }
            )
        return pd.DataFrame(baris).set_index("Nama")

    def tabel_evaluasi(self) -> pd.DataFrame:
        path = self._cari_berkas(["tabel_evaluasi_ensemble_revisi.csv", "tabel_evaluasi_lstm_revisi.csv", "tabel_evaluasi_final.csv"], wajib=False)
        return pd.read_csv(path) if path is not None else pd.DataFrame()

    def evaluasi_per_komoditas(self) -> pd.DataFrame:
        path = self._cari_berkas(["evaluasi_per_komoditas_lstm_revisi.csv", "evaluasi_per_komoditas.csv"], wajib=False)
        return pd.read_csv(path) if path is not None else pd.DataFrame()

    def hasil_test(self, nama: str | None = None) -> pd.DataFrame:
        """Aktual vs prediksi pada test set (angka resmi Bab IV)."""
        path = self._cari_berkas(["hasil_prediksi_ensemble_revisi.csv", "hasil_prediksi_lstm_revisi.csv", "hasil_prediksi_test.csv"], wajib=False)
        df = pd.read_csv(path) if path is not None else pd.DataFrame()
        if nama is not None:
            if "Nama" in df.columns:
                df = df[df["Nama"] == nama].reset_index(drop=True)
        return df

    def feature_importance(self) -> pd.DataFrame:
        """Hasil SHAP: kontribusi tiap fitur terhadap keputusan model."""
        path = self._cari_berkas(["shap_feature_importance.csv"], wajib=False)
        return pd.read_csv(path) if path is not None else pd.DataFrame()


# ---------------------------------------------------------------- loader
def muat_prediktor(artifact_dir: str | Path = DEFAULT_ARTIFACT_DIR) -> PrediktorProduksi:
    """
    Loader dengan cache. Di Streamlit, model + scaler hanya dimuat SEKALI
    lalu dipakai ulang di semua interaksi.
    """
    try:
        import streamlit as st

        @st.cache_resource(show_spinner="Memuat model LSTM...")
        def _muat(path: str) -> PrediktorProduksi:
            return PrediktorProduksi(path)

        return _muat(str(artifact_dir))
    except ImportError:
        return PrediktorProduksi(artifact_dir)


if __name__ == "__main__":
    import time

    p = PrediktorProduksi()
    print("Komoditas dikenali :", len(p.daftar_komoditas))
    print("Encoding           :", p.encoding, "| timestep:", p.timestep)
    print("Metrik test        :", p.metrik_test())

    t = time.time()
    semua = p.prediksi_n_bulan_banyak(p.daftar_komoditas, 3)
    print(f"\n26 komoditas x 3 bulan (batch): {time.time() - t:.2f}s")

    t = time.time()
    bt = p.backtest_banyak(p.daftar_komoditas, 6)
    print(f"backtest 26 komoditas x 6 bulan : {time.time() - t:.2f}s")

    print("\nContoh Kentang:")
    print(p.prediksi_n_bulan("Kentang", 3).to_string(index=False))
    print("\nBacktest Kentang:")
    print(bt["Kentang"][["Label", "aktual", "prediksi", "split"]].to_string(index=False))
    print("\nKondisi awal Kentang:", p.kondisi_awal("Kentang"))
