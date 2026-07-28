"""
Preprocessing dan analisis dataset produksi gabungan.

Tujuan:
- membaca seluruh tahun dari Excel `Data_Produksi_2023_2026_Gabungan.xlsx`,
- mengekspor versi CSV agar mudah dipakai di Colab,
- menormalkan nama komoditas yang berbeda penulisan,
- menandai komoditas all-zero / histori terlalu pendek,
- menyiapkan data bersih untuk eksperimen LSTM ulang.

Output disimpan di folder `program_colabs/artefak_model/`.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent
SOURCE_XLSX = ROOT / "dataset" / "Data_Produksi_2023_2026_Gabungan.xlsx"
OUTPUT_DIR = ROOT / "artefak_model"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

NAMA_MAP = {
    "Cabai Besar/ TW / Teropong": "Cabai Besar",
}

BULAN_MAP = {
    "Januari": 1,
    "Februari": 2,
    "Maret": 3,
    "April": 4,
    "Mei": 5,
    "Juni": 6,
    "Juli": 7,
    "Agustus": 8,
    "September": 9,
    "Oktober": 10,
    "November": 11,
    "Desember": 12,
}


def load_production() -> pd.DataFrame:
    df = pd.read_excel(SOURCE_XLSX)
    df = df.rename(
        columns={
            "Nama Komoditas": "Nama",
            "Luas Tan Akhir Bulan Lalu": "Luas_Tan_Akhir_Bulan_Lalu",
            "Luas Panen Habis": "Luas_Panen_Habis",
            "Luas Panen Belum Habis": "Luas_Panen_Belum_Habis",
            "Luas Rusak": "Luas_Rusak",
            "Luas Tambah Tanam": "Luas_Tambah_Tanam",
            "Luas Tan Akhir": "Luas_Tan_Akhir",
            "Produksi Habis (Kw)": "Produksi_Habis_Kw",
            "Produksi Belum Habis (Kw)": "Produksi_Belum_Habis_Kw",
            "Harga Jual Petani (Rp/Kg)": "Harga_Jual_Petani_RpKg",
        }
    )
    df["Nama"] = df["Nama"].replace(NAMA_MAP)
    df["Bulan_num"] = df["Bulan"].map(BULAN_MAP).astype(int)
    df["Periode"] = pd.to_datetime(
        df["Tahun"].astype(str) + "-" + df["Bulan_num"].astype(str).str.zfill(2) + "-01"
    )
    df["Produksi_kg"] = (df["Produksi_Habis_Kw"] + df["Produksi_Belum_Habis_Kw"]) * 100
    df["Luas_Panen_ha"] = df["Luas_Panen_Habis"] + df["Luas_Panen_Belum_Habis"]
    df["is_zero_produksi"] = (df["Produksi_kg"] == 0).astype(int)
    df = df.sort_values(["Nama", "Periode"]).reset_index(drop=True)
    return df


def build_analysis(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    summary = (
        df.groupby("Nama")
        .agg(
            n=("Produksi_kg", "size"),
            zero=("Produksi_kg", lambda s: int((s == 0).sum())),
            positive=("Produksi_kg", lambda s: int((s > 0).sum())),
            min_prod=("Produksi_kg", "min"),
            median_prod=("Produksi_kg", "median"),
            mean_prod=("Produksi_kg", "mean"),
            max_prod=("Produksi_kg", "max"),
        )
        .reset_index()
        .sort_values(["positive", "n", "Nama"])
    )
    summary["zero_ratio"] = summary["zero"] / summary["n"]

    keep_model = summary[(summary["positive"] >= 4) & (summary["n"] >= 12)].copy()
    drop_model = summary[~summary["Nama"].isin(keep_model["Nama"])].copy()
    return summary, keep_model, drop_model


def md_table(frame: pd.DataFrame, columns: list[str]) -> str:
    frame = frame[columns].copy()
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join(["---"] * len(columns)) + " |",
    ]
    for _, row in frame.iterrows():
        lines.append("| " + " | ".join(str(row[col]) for col in columns) + " |")
    return "\n".join(lines)


def write_report(df: pd.DataFrame, summary: pd.DataFrame, keep_model: pd.DataFrame, drop_model: pd.DataFrame) -> None:
    top_zero = summary.sort_values(["zero_ratio", "n"], ascending=[False, False]).head(10)
    top_sparse = summary.sort_values(["positive", "n"], ascending=[True, True]).head(10)

    lines = [
        "# Analisis Dataset Produksi Gabungan",
        "",
        f"- Sumber: `{SOURCE_XLSX.name}`",
        f"- Total baris: {len(df)}",
        f"- Tahun: {sorted(df['Tahun'].unique().tolist())}",
        f"- Komoditas unik setelah normalisasi nama: {df['Nama'].nunique()}",
        f"- Baris produksi nol: {int(df['is_zero_produksi'].sum())} ({df['is_zero_produksi'].mean()*100:.1f}%)",
        "",
        "## Komoditas bermasalah",
        "",
        "Komoditas yang dipertahankan untuk modeling (punya histori cukup):",
        "",
        md_table(keep_model, ["Nama", "n", "positive", "zero", "zero_ratio"]),
        "",
        "Komoditas yang dibuang dari modeling karena terlalu tipis / all-zero:",
        "",
        md_table(drop_model, ["Nama", "n", "positive", "zero", "zero_ratio"]),
        "",
        "## Komoditas paling rawan",
        "",
        "Rasio nol tertinggi:",
        "",
        md_table(top_zero, ["Nama", "n", "positive", "zero", "zero_ratio"]),
        "",
        "Histori paling pendek / paling tipis:",
        "",
        md_table(top_sparse, ["Nama", "n", "positive", "zero", "zero_ratio"]),
        "",
        "## Kesimpulan",
        "",
        "- Dataset ini memang sangat sparsity-heavy: banyak komoditas bernilai 0 terus atau sangat sedikit observasinya.",
        "- Dua komoditas hanya muncul 3 baris dan seluruhnya 0, sehingga hampir pasti merusak training MAPE.",
        "- Untuk eksperimen LSTM ulang, gunakan CSV bersih dan pertimbangkan filtering komoditas tipis, transformasi log1p, dan pemodelan zero-inflated.",
    ]
    (OUTPUT_DIR / "laporan_analisis_dataset_revisi.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    df = load_production()
    summary, keep_model, drop_model = build_analysis(df)

    raw_csv = OUTPUT_DIR / "data_produksi_gabungan_raw.csv"
    clean_csv = OUTPUT_DIR / "data_produksi_gabungan_clean.csv"
    summary_csv = OUTPUT_DIR / "ringkasan_komoditas.csv"
    keep_csv = OUTPUT_DIR / "komoditas_dipakai_model.csv"
    drop_csv = OUTPUT_DIR / "komoditas_dibuang_model.csv"

    df.to_csv(raw_csv, index=False)
    summary.to_csv(summary_csv, index=False)
    keep_model.to_csv(keep_csv, index=False)
    drop_model.to_csv(drop_csv, index=False)

    clean_df = df[df["Nama"].isin(keep_model["Nama"])].copy()
    clean_df.to_csv(clean_csv, index=False)
    write_report(df, summary, keep_model, drop_model)

    print(f"Raw CSV   : {raw_csv}")
    print(f"Clean CSV : {clean_csv}")
    print(f"Report    : {OUTPUT_DIR / 'laporan_analisis_dataset_revisi.md'}")
    print(f"Komoditas dipakai model: {len(keep_model)}")
    print(f"Komoditas dibuang      : {len(drop_model)}")


if __name__ == "__main__":
    main()
