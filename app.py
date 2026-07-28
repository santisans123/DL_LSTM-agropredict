import os
import re
import math

import streamlit as st
import pandas as pd
import altair as alt
import plotly.graph_objects as go

from predictor import muat_prediktor

# ====================================================================
# 1. KONFIGURASI HALAMAN
# ====================================================================
st.set_page_config(
    page_title="AgroPredict — Prediksi Panen Cisarua",
    page_icon="🌱",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --------------------------------------------------------------------
# Model LSTM hasil training dimuat sekali di sini, lalu dipakai ulang
# oleh seluruh halaman lewat objek `p`.
# --------------------------------------------------------------------
try:
    p = muat_prediktor()
except Exception as _e:
    st.error(
        "Model LSTM gagal dimuat. Pastikan artefak ada di `program_colabs/artefak_model/` "
        "(utama) atau `artefak_model/` (legacy), dan `scikit-learn` serta `tensorflow` "
        f"sudah terpasang.\n\n{_e}"
    )
    st.stop()

# app.py dan predictor.py harus sepasang. Kalau salah satunya ketinggalan versi,
# errornya akan muncul jauh di dalam kode dan sulit ditebak — jadi dicek di sini.
_kurang = [
    m for m in ("hitung_faktor", "backtest_banyak", "prediksi_n_bulan_banyak",
                "metrik_per_komoditas", "kondisi_awal")
    if not hasattr(p, m)
]
if _kurang or "luasPanen" not in p.kondisi_awal(p.daftar_komoditas[0]):
    st.error(
        "**`predictor.py` masih versi lama**, tidak cocok dengan `app.py` ini.\n\n"
        "Timpa `predictor.py` dengan versi terbaru, lalu hentikan Streamlit "
        "(Ctrl+C di terminal) dan jalankan ulang — model disimpan di cache, "
        "jadi menyegarkan halaman saja tidak cukup."
    )
    st.stop()

# ====================================================================
# 2. SISTEM DESAIN (design tokens)
# --------------------------------------------------------------------
# Palet diambil dari lanskap Cisarua: kertas daur ulang, pinus gelap,
# hijau terasering, tanah vulkanik, dan merah cabai untuk peringatan.
# ====================================================================
PAPER = "#F4F6F1"
SURFACE = "#FFFFFF"
INK = "#16261D"
MUTED = "#5F6E63"
LINE = "#DEE4DA"
GREEN = "#2E6F4E"
GREEN_SOFT = "#E6F0E8"
AMBER = "#9A6314"
AMBER_SOFT = "#FAF0DC"
CLAY = "#A93226"
CLAY_SOFT = "#FAE9E6"
INDIGO = "#1F4F73"
INDIGO_SOFT = "#E5EDF3"

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
    --paper: #F4F6F1;
    --surface: #FFFFFF;
    --ink: #16261D;
    --muted: #5F6E63;
    --line: #DEE4DA;
    --green: #2E6F4E;
    --green-soft: #E6F0E8;
    --amber: #9A6314;
    --amber-soft: #FAF0DC;
    --clay: #A93226;
    --clay-soft: #FAE9E6;
    --indigo: #1F4F73;
    --indigo-soft: #E5EDF3;
    --radius: 14px;
}

/* --- dasar --- */
.stApp { background: var(--paper); }
html, body, [class*="css"], .stMarkdown, p, li, label, div {
    font-family: 'Instrument Sans', system-ui, sans-serif;
    color: var(--ink);
}
.block-container { padding-top: 4.2rem; padding-bottom: 3rem; max-width: 1320px; }
h1, h2, h3 { font-family: 'Fraunces', Georgia, serif; color: var(--ink); letter-spacing: -0.015em; }
h4, h5, h6 { font-family: 'Instrument Sans', sans-serif; font-weight: 700; color: var(--ink); }
a { color: var(--green); }

/* --- masthead --- */
.eyebrow {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted);
}
.eyebrow-mark {
    display: inline-block; width: 26px; height: 2px; background: var(--green);
    vertical-align: middle; margin-right: 10px;
}
.masthead h1 {
    font-size: 2.6rem; font-weight: 700; line-height: 1.08;
    margin: 12px 0 10px 0; max-width: 22ch;
}
.masthead h1 em { font-style: italic; color: var(--green); }
.masthead p { color: var(--muted); font-size: 0.95rem; line-height: 1.6; margin: 0; max-width: 68ch; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }

/* --- papan peringkat komoditas --- */
.board { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow-x: auto; }
.board table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
.board th {
    text-align: left; font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted); font-weight: 700; padding: 12px 16px;
    background: #FAFBF8; border-bottom: 1px solid var(--line);
}
.board td { padding: 12px 16px; border-bottom: 1px solid #F1F3EF; vertical-align: middle; }
.board tr:last-child td { border-bottom: 0; }
.board tr.is-top td { background: #F4F9F5; }
.board tr.is-active td { box-shadow: inset 3px 0 0 var(--green); }
.board .rank {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; color: var(--muted); width: 34px;
}
.board .name { font-weight: 700; white-space: nowrap; }
.board .cat { font-size: 0.72rem; color: var(--muted); font-weight: 500; }
.board .mono { font-family: 'IBM Plex Mono', monospace; text-align: right; white-space: nowrap; }
.bar-wrap { display: flex; align-items: center; gap: 9px; min-width: 128px; }
.bar-track { flex: 1; height: 6px; background: #EDF0EA; border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; }
.bar-num { font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; font-weight: 600; width: 26px; }
.pick {
    background: var(--green-soft); border: 1px solid #C9DFCE; border-radius: var(--radius);
    padding: 20px 22px; height: 100%;
}
.pick .big {
    font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: 1.7rem;
    color: var(--green); line-height: 1.15; margin: 6px 0 8px 0;
}

@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.masthead { animation: rise 0.5s ease-out both; }
@media (prefers-reduced-motion: reduce) { .masthead { animation: none; } }
.chip {
    background: var(--surface); border: 1px solid var(--line); color: var(--muted);
    border-radius: 999px; padding: 5px 12px; font-size: 0.74rem; font-weight: 600;
}
.rule { height: 1px; background: var(--line); margin: 26px 0 22px 0; border: 0; }

/* --- kartu umum --- */
.card {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: var(--radius); padding: 20px 22px;
}
.card + .card { margin-top: 14px; }
.card-label {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--muted); margin: 0 0 10px 0;
}
.num {
    font-family: 'IBM Plex Mono', monospace; font-weight: 600;
    font-size: 1.85rem; color: var(--ink); line-height: 1.1;
}
.unit { font-size: 0.95rem; font-weight: 600; color: var(--muted); margin-left: 4px; }
.plain {
    font-size: 0.82rem; color: var(--muted); line-height: 1.45; margin: 10px 0 0 0;
}
.plain strong { color: var(--ink); }

/* --- kartu vonis (elemen tanda tangan) --- */
.verdict {
    background: var(--surface); border: 1px solid var(--line);
    border-left: 6px solid var(--green);
    border-radius: var(--radius); padding: 24px 26px;
}
.verdict h2 {
    font-size: 1.9rem; font-weight: 700; line-height: 1.15; margin: 6px 0 10px 0;
}
.verdict-why { font-size: 0.88rem; color: var(--muted); line-height: 1.6; margin: 0; }
.score-track {
    height: 8px; background: #EDF0EA; border-radius: 999px; margin-top: 16px; overflow: hidden;
}
.score-fill { height: 100%; border-radius: 999px; }
.score-caption {
    font-size: 0.72rem; color: var(--muted); margin-top: 7px;
    font-family: 'IBM Plex Mono', monospace;
}

/* --- strip 3 bulan --- */
.strip { display: flex; gap: 10px; }
.strip-item {
    flex: 1; background: var(--surface); border: 1px solid var(--line);
    border-radius: 12px; padding: 14px 16px;
}
.strip-item .m {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted);
}
.strip-item .v {
    font-family: 'IBM Plex Mono', monospace; font-weight: 600;
    font-size: 1.3rem; margin-top: 4px;
}

/* --- pil status --- */
.pill {
    display: inline-block; border-radius: 999px; padding: 4px 11px;
    font-size: 0.73rem; font-weight: 700; border: 1px solid transparent;
}
.pill-green { background: var(--green-soft); color: var(--green); border-color: #C9DFCE; }
.pill-amber { background: var(--amber-soft); color: var(--amber); border-color: #EBD9AF; }
.pill-clay  { background: var(--clay-soft);  color: var(--clay);  border-color: #EFC9C3; }
.pill-indigo{ background: var(--indigo-soft);color: var(--indigo);border-color: #C7D9E6; }

/* --- catatan penjelas --- */
.note {
    background: var(--green-soft); border: 1px solid #CFE1D4;
    border-radius: 12px; padding: 16px 18px;
}
.note.amber { background: var(--amber-soft); border-color: #EBD9AF; }
.note.indigo { background: var(--indigo-soft); border-color: #C7D9E6; }
.note h5 {
    margin: 0 0 6px 0; font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase;
}
.note p { margin: 0; font-size: 0.83rem; line-height: 1.55; color: var(--ink); }

/* --- tabel --- */
table.clean { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
table.clean th {
    text-align: left; font-size: 0.66rem; letter-spacing: 0.09em; text-transform: uppercase;
    color: var(--muted); font-weight: 700; padding: 10px 14px; border-bottom: 1px solid var(--line);
}
table.clean td { padding: 11px 14px; border-bottom: 1px solid #F0F2EE; }
table.clean tr:last-child td { border-bottom: 0; }
table.clean td.k { color: var(--muted); font-weight: 600; }
table.clean td.v { text-align: right; font-weight: 700; }
table.clean td.mono { font-family: 'IBM Plex Mono', monospace; }

/* --- sidebar --- */
[data-testid="stSidebar"] { background: #EEF1EA; border-right: 1px solid var(--line); }
[data-testid="stSidebar"] .block-container { padding-top: 1.4rem; }
.side-brand {
    font-family: 'Fraunces', serif; font-weight: 700; font-size: 1.15rem; line-height: 1.2;
}
.side-sub { font-size: 0.74rem; color: var(--muted); margin-top: 2px; }
[data-testid="stSidebar"] label { font-size: 0.82rem !important; font-weight: 600 !important; }

/* --- tabs --- */
.stTabs [data-baseweb="tab-list"] { gap: 4px; border-bottom: 1px solid var(--line); }
.stTabs [data-baseweb="tab"] {
    height: 42px; padding: 0 16px; background: transparent;
    font-weight: 600; font-size: 0.88rem; color: var(--muted);
}
.stTabs [aria-selected="true"] { color: var(--green) !important; }

/* --- tombol --- */
.stButton > button {
    border-radius: 10px; border: 1px solid var(--green); background: var(--green);
    color: #fff; font-weight: 600; font-size: 0.88rem; padding: 0.5rem 1rem;
}
.stButton > button:hover { background: #255C40; border-color: #255C40; color: #fff; }
.stDownloadButton > button {
    border-radius: 10px; border: 1px solid var(--line); background: var(--surface);
    color: var(--ink); font-weight: 600;
}

/* --- input --- */
[data-testid="stMetricValue"] { font-family: 'IBM Plex Mono', monospace; }
div[data-baseweb="select"] > div, .stNumberInput input, .stTextInput input {
    border-radius: 10px !important; border-color: var(--line) !important;
}

/* --- footer --- */
.foot {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;
    font-size: 0.74rem; color: var(--muted); padding-top: 6px;
}

@media (max-width: 820px) {
    .masthead h1 { font-size: 1.75rem; max-width: none; }
    .board { overflow-x: auto; }
    .strip { flex-direction: column; }
}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)


# ====================================================================
# 3. PEMBANTU TAMPILAN
# ====================================================================
def html(markup: str):
    """Menulis markup HTML ke halaman."""
    st.markdown(markup, unsafe_allow_html=True)


def style_chart(chart):
    """Menyeragamkan gaya seluruh grafik Altair dengan sistem desain."""
    return (
        chart.configure_view(strokeWidth=0)
        .configure_axis(
            labelFont="Instrument Sans", titleFont="Instrument Sans",
            labelColor=MUTED, titleColor=MUTED, labelFontSize=11, titleFontSize=11,
            titleFontWeight=600, grid=True, gridColor="#EDF0EA", domainColor=LINE, tickColor=LINE,
        )
        .configure_legend(
            labelFont="Instrument Sans", titleFont="Instrument Sans",
            labelColor=INK, titleColor=MUTED, labelFontSize=11, titleFontSize=11,
            orient="top", direction="horizontal", symbolType="stroke", symbolStrokeWidth=3,
        )
        .configure_axisX(grid=False)
        .properties(background="transparent")
    )


def tone_of(status_text: str):
    """Menerjemahkan status ber-emoji menjadi (kelas pil, warna, ikon)."""
    if "🔴" in status_text:
        return "pill-clay", CLAY, "Tahan dulu"
    if "🟡" in status_text:
        return "pill-amber", AMBER, "Bisa jalan, dengan catatan"
    return "pill-green", GREEN, "Kondisi mendukung"


def rupiah(n: float) -> str:
    return f"Rp {n:,.0f}".replace(",", ".")


def ribu(n: float) -> str:
    return f"{n:,.0f}".replace(",", ".")
# ====================================================================
# 4. DATA KOMODITAS — SEPENUHNYA DARI MODEL LSTM
# --------------------------------------------------------------------
# Tidak ada lagi angka contoh di file ini. Semua isi COMMODITIES ditarik
# dari artefak hasil training di Google Colab:
#   * riwayat produksi & cuaca -> dataset_final_raw.csv
#   * aktual vs prediksi       -> model LSTM (backtest satu langkah ke depan)
#   * MAPE & RMSE per komoditas-> hasil_prediksi_test.csv (angka Bab IV)
# ====================================================================
EMOJI = {
    "Bawang Daun": "🌿", "Bawang Merah": "🧅", "Bawang Putih": "🧄", "Bayam": "🥬",
    "Buncis": "🫘", "Cabai Besar": "🌶️", "Cabai Keriting": "🌶️", "Cabai Rawit": "🌶️",
    "Jamur Lainnya": "🍄", "Jamur Merang": "🍄", "Jamur Tiram": "🍄",
    "Kacang Panjang": "🫛", "Kangkung": "🥬", "Kembang Kol": "🥦", "Kentang": "🥔",
    "Kubis": "🥬", "Labu Siam": "🎃", "Melon": "🍈", "Mentimun": "🥒", "Paprika": "🫑",
    "Petsai/Sawi": "🥬", "Semangka": "🍉", "Stroberi": "🍓", "Terung": "🍆",
    "Tomat": "🍅", "Wortel": "🥕",
}

KATEGORI = {
    "Melon": "Buah-buahan", "Semangka": "Buah-buahan", "Stroberi": "Buah-buahan",
    "Jamur Lainnya": "Jamur", "Jamur Merang": "Jamur", "Jamur Tiram": "Jamur",
}

# Suhu optimum tiap komoditas (°C) untuk dataran tinggi Cisarua.
# Dipakai hanya untuk penilaian kelayakan tanam, bukan untuk prediksi model.
SUHU_IDEAL = {
    "Bawang Daun": 20, "Bawang Merah": 25, "Bawang Putih": 20, "Bayam": 24,
    "Buncis": 21, "Cabai Besar": 24, "Cabai Keriting": 24, "Cabai Rawit": 25,
    "Jamur Lainnya": 24, "Jamur Merang": 30, "Jamur Tiram": 25,
    "Kacang Panjang": 25, "Kangkung": 26, "Kembang Kol": 19, "Kentang": 19,
    "Kubis": 21, "Labu Siam": 22, "Melon": 27, "Mentimun": 24, "Paprika": 22,
    "Petsai/Sawi": 20, "Semangka": 27, "Stroberi": 18, "Terung": 25,
    "Tomat": 23, "Wortel": 19,
}

MEDIA_TANAH = "Tanah"
MEDIA_BAGLOG = "Baglog / media kompos"
MEDIA_OPSI = [MEDIA_TANAH, MEDIA_BAGLOG]

# Media tanam tidak ikut dilatih ke dalam model (data BPS hanya mencatat
# budidaya di tanah), jadi pengaruhnya dipasang terbuka sebagai pengali
# agronomis di luar model — bukan hasil belajar LSTM.
FAKTOR_MEDIA = {MEDIA_TANAH: 1.0, MEDIA_BAGLOG: 1.10}

# Metrik seluruh model (dipakai di kepala halaman & kartu akurasi)
METRIK_MODEL = p.metrik_test()
AKURASI_MODEL = max(0.0, 100.0 - METRIK_MODEL["MedianMAPE"])


def suhu_ideal_dari(commodity) -> int:
    """Suhu optimum komoditas; 21°C dipakai bila belum terdaftar."""
    return SUHU_IDEAL.get(commodity.get("name", ""), 21)


def aman(nilai, cadangan=1.0):
    """Pembagi yang dijamin tidak nol — banyak komoditas punya bulan tanpa panen."""
    try:
        nilai = float(nilai)
    except (TypeError, ValueError):
        return cadangan
    return nilai if nilai > 0 else cadangan


@st.cache_data(show_spinner="Membaca data 26 komoditas dari model...")
def bangun_komoditas():
    """Menyusun daftar komoditas lengkap dari artefak model (dihitung sekali)."""
    nama_semua = p.daftar_komoditas
    backtest = p.backtest_banyak(nama_semua, 6)
    metrik = p.metrik_per_komoditas()
    ramalan = p.prediksi_n_bulan_banyak(nama_semua, 3)

    daftar = []
    for nama in nama_semua:
        hist = p.riwayat(nama)
        awal_form = p.kondisi_awal(nama)
        bt = backtest[nama]
        m = metrik.loc[nama] if nama in metrik.index else None

        riwayat_12 = hist.tail(12)
        cuaca = [
            {
                "month": f"{r.Bulan[:3]} {r.Tahun}",
                "temp": round(float(r.Suhu_Rata), 1),
                "rain": round(float(r.Curah_Hujan), 1),
                "production": int(round(float(r.Produksi_kg))),
            }
            for r in riwayat_12.itertuples()
        ]

        histori = [
            {
                "month": r.Label,
                "actual": int(round(r.aktual)),
                "predicted": int(round(r.prediksi)),
                "split": r.split,
            }
            for r in bt.itertuples()
        ]

        harga_seri = hist["Harga Jual Petani (Rp/Kg)"]
        harga_seri = harga_seri[harga_seri > 0]
        harga_min = float(harga_seri.min()) if len(harga_seri) else 0.0
        harga_maks = float(harga_seri.max()) if len(harga_seri) else 0.0

        panen_saja = hist[hist["Produksi_kg"] > 0]["Produksi_kg"]
        rata_panen = float(panen_saja.mean()) if len(panen_saja) else 0.0

        r3 = ramalan[nama]
        prediksi_dasar = [
            {
                "month": f"{r.Bulan_Singkat} {r.Tahun}",
                "predicted": int(round(r.Prediksi_kg)),
            }
            for r in r3.itertuples()
        ]

        mape = float(m["MAPE"]) if m is not None else METRIK_MODEL["MedianMAPE"]
        daftar.append(
            {
                "id": re.sub(r"[^a-z0-9]+", "_", nama.lower()).strip("_"),
                "name": nama,
                "category": KATEGORI.get(nama, "Sayuran"),
                "image": EMOJI.get(nama, "🌿"),
                "metrics": {
                    "mape": round(mape, 1),
                    "rmse": round(float(m["RMSE"]), 1) if m is not None else 0.0,
                    "r2": round(METRIK_MODEL["R2"], 3),
                    "mape_tersedia": bool(m["mape_tersedia"]) if m is not None else False,
                    "n_uji": int(m["n_uji"]) if m is not None else 0,
                },
                "history": histori,
                "weather": cuaca,
                "defaultForm": {
                    "luasTanamAkhir": max(0.1, awal_form["luasTanamAkhir"]),
                    # Satu isian "luas panen" = panen habis + panen belum habis,
                    # definisi yang sama dengan notebook Bagian 4.1.
                    "luasPanenHabis": awal_form["luasPanen"],
                    "luasPanenBelumHabis": 0.0,
                    "luasRusak": awal_form["luasRusak"],
                    "luasTambahTanam": awal_form["luasTambahTanam"],
                    "pupuk": max(1.0, awal_form["pupuk"]),
                    "mediaTanam": (
                        MEDIA_BAGLOG if nama.startswith("Jamur") else MEDIA_TANAH
                    ),
                    # Dibulatkan ke bilangan bulat supaya sama persis dengan nilai
                    # yang bisa dipilih slider — kalau tidak, kondisi yang belum
                    # diubah pengguna akan terbaca sebagai "skenario baru".
                    "suhuAvg": int(round(awal_form["suhuAvg"])),
                    "curahHujan": int(round(awal_form["curahHujan"] / 10.0) * 10),
                    "suhuMax": round(awal_form["suhuAvg"] + 3.0, 1),
                    "suhuMin": round(awal_form["suhuAvg"] - 3.0, 1),
                    "kecepatanAngin": 3.5,
                    "hargaJual": awal_form["hargaJual"] or 5000.0,
                    "produksiHabis": round(rata_panen, 1),
                    "produksiBelumHabis": 0.0,
                },
                "pricePerKgRange": (
                    f"Rp {harga_min:,.0f} - Rp {harga_maks:,.0f}".replace(",", ".")
                    if harga_maks
                    else "Belum ada catatan harga"
                ),
                "rataPanen": round(rata_panen, 1),
                "prediksiDasar": prediksi_dasar,
            }
        )
    return daftar


COMMODITIES = bangun_komoditas()


# ====================================================================
# 5. MESIN PREDIKSI — MEMANGGIL MODEL LSTM YANG SUDAH DILATIH
# ====================================================================
def bentuk_isian(commodity, form):
    """
    Menerjemahkan isian panel kiri menjadi fitur yang benar-benar dibaca model.

    Model dilatih memakai 9 fitur; empat di antaranya bisa diatur pengguna:
        Luas_Panen_ha   = luas panen habis + panen belum habis
                          (definisi persis seperti notebook Bagian 4.1;
                           luas rusak TIDAK dikurangkan, mengikuti data BPS)
        Suhu_Rata       = suhu rata-rata 3 bulan terakhir
        Curah_Hujan     = curah hujan 3 bulan terakhir
        Total_Pupuk_Kg  = dosis pupuk per hektare
    """
    dasar = commodity["defaultForm"]
    return {
        "Luas_Panen_ha": float(form.get("luasPanenHabis", 0.0))
        + float(form.get("luasPanenBelumHabis", 0.0)),
        "Suhu_Rata": float(form.get("suhuAvg", dasar["suhuAvg"])),
        "Curah_Hujan": float(form.get("curahHujan", dasar["curahHujan"])),
        "Total_Pupuk_Kg": float(form.get("pupuk", dasar["pupuk"])),
    }


def bentuk_override(commodity, form):
    """
    Hanya fitur yang BENAR-BENAR diubah pengguna yang dikirim ke model.

    Kalau panel kiri belum disentuh, hasilnya kosong sehingga model berjalan
    apa adanya — angkanya jadi sama persis dengan baris komoditas ini di papan
    peringkat, tidak ada selisih yang membingungkan.
    """
    dasar = commodity["defaultForm"]
    semula = {
        "Luas_Panen_ha": float(dasar["luasPanenHabis"]) + float(dasar["luasPanenBelumHabis"]),
        "Suhu_Rata": float(dasar["suhuAvg"]),
        "Curah_Hujan": float(dasar["curahHujan"]),
        "Total_Pupuk_Kg": float(dasar["pupuk"]),
    }
    isian = bentuk_isian(commodity, form)
    return {k: v for k, v in isian.items() if abs(v - semula[k]) > 1e-9}


def faktor_media(form):
    """
    Media tanam bukan fitur model (data BPS hanya mencatat budidaya di tanah),
    jadi pengaruhnya diterapkan sebagai pengali agronomis DI LUAR model dan
    ditulis terbuka di sini: hidroponik +15%, rumah kaca +25%.
    """
    return FAKTOR_MEDIA.get(form.get("mediaTanam", "Tanah"), 1.0)


def calculate_simulation(commodity, form):
    """Prediksi panen bulan depan, langsung dari model LSTM hasil training."""
    ov = bentuk_override(commodity, form)
    nilai = p.prediksi_skenario(
        commodity["name"],
        suhu=ov.get("Suhu_Rata"),
        curah_hujan=ov.get("Curah_Hujan"),
        luas_panen=ov.get("Luas_Panen_ha"),
        pupuk=ov.get("Total_Pupuk_Kg"),
    )
    return int(round(max(0.0, nilai * faktor_media(form))))


def sensitivitas_lokal(commodity, form):
    """
    Arah pengaruh tiap fitur pada kondisi yang sedang diisi pengguna: tiap
    fitur dinaikkan 10%, lalu dilihat perubahan keluaran model. Ini melengkapi
    SHAP global (yang hanya menunjukkan besar pengaruh, bukan arahnya).
    """
    nama = commodity["name"]
    isian = bentuk_isian(commodity, form)
    dasar = calculate_simulation(commodity, form)
    pengali = faktor_media(form)

    label = {
        "Luas_Panen_ha": "Luas panen",
        "Suhu_Rata": "Suhu rata-rata",
        "Curah_Hujan": "Curah hujan",
        "Total_Pupuk_Kg": "Dosis pupuk",
    }
    baris = []
    for kunci, nama_tampil in label.items():
        naik = dict(isian)
        naik[kunci] = isian[kunci] * 1.10 if isian[kunci] else 1.0
        hasil = p.prediksi_skenario(
            nama, suhu=naik["Suhu_Rata"], curah_hujan=naik["Curah_Hujan"],
            luas_panen=naik["Luas_Panen_ha"], pupuk=naik["Total_Pupuk_Kg"],
        ) * pengali
        baris.append({"Fitur": nama_tampil, "Dampak": hasil - dasar})
    return dasar, pd.DataFrame(baris)


# ====================================================================
# TAMBAHAN FITUR BARU (MODULAR FUNCTIONS)
# ====================================================================

def get_next_months(last_month, n=3):
    """
    Fungsi pembantu untuk mendapatkan urutan nama bulan berikutnya.
    """
    months_seq = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    try:
        idx = months_seq.index(last_month)
    except ValueError:
        idx = 5  # Default setelah Jun jika tidak ditemukan
    
    out = []
    for i in range(1, n + 1):
        out.append(months_seq[(idx + i) % 12])
    return out


def predict_next_3_months(commodity, form):
    """
    Ramalan 3 bulan ke depan dari model LSTM secara rekursif: hasil prediksi
    bulan pertama dipakai sebagai masukan bulan kedua, dan seterusnya
    (fungsi prediksi_n_bulan di predictor.py).
    """
    ov = bentuk_override(commodity, form)
    faktor = faktor_media(form)
    df = p.prediksi_n_bulan(commodity["name"], 3, override=ov)
    return [
        {
            "month": f"{r.Bulan_Singkat} {r.Tahun}",
            "predicted": int(round(r.Prediksi_kg * faktor)),
        }
        for r in df.itertuples()
    ]


def calculate_recommendation(commodity, form, predicted_val):
    """
    FITUR 3: Rekomendasi Waktu Tanam.
    Menghitung skor kelayakan penanaman berdasarkan Multi-Criteria Decision Support System.
    """
    score = 0
    reasons = []
    
    # 1. Kriteria Suhu Ideal
    opt_temp = suhu_ideal_dari(commodity)
    
    temp_diff = abs(form.get("suhuAvg", 21) - opt_temp)
    if temp_diff <= 1.5:
        score += 30
        reasons.append("✔ Suhu harian sangat ideal untuk mendukung pertumbuhan vegetatif tanaman.")
    elif temp_diff <= 3.0:
        score += 20
        reasons.append("✔ Suhu lingkungan berada dalam rentang toleransi pertumbuhan.")
    else:
        score += 5
        reasons.append("⚠️ Suhu menyimpang dari kondisi optimum hortikultura di pegunungan Cisarua.")
        
    # 2. Kriteria Dosis Pupuk
    default_pupuk = aman(commodity["defaultForm"]["pupuk"], 1.0)
    pupuk_ratio = form.get("pupuk", default_pupuk) / default_pupuk
    if pupuk_ratio >= 1.0:
        score += 25
        reasons.append("✔ Kecukupan nutrisi hara terjamin dengan pemberian dosis pupuk optimal.")
    elif pupuk_ratio >= 0.75:
        score += 15
        reasons.append("✔ Nutrisi pupuk memadai untuk pertumbuhan standar.")
    else:
        score += 5
        reasons.append("⚠️ Dosis pemupukan berada di bawah anjuran kritis.")
        
    # 3. Kriteria Risiko Lahan Rusak
    luas_tanam = max(0.1, form.get("luasTanamAkhir", 1.0))
    luas_rusak = form.get("luasRusak", 0.0)
    rusak_ratio = luas_rusak / luas_tanam
    if rusak_ratio < 0.05:
        score += 25
        reasons.append("✔ Tingkat risiko kegagalan lahan (puso) terpantau sangat minimal.")
    elif rusak_ratio < 0.15:
        score += 15
        reasons.append("✔ Risiko kegagalan lahan masih dalam tingkat toleransi wajar.")
    else:
        score += 5
        reasons.append("⚠️ Area kerusakan lahan tergolong tinggi. Waspadai serangan OPT.")
        
    # 4. Kriteria Hasil Prediksi LSTM vs Rerata Historis
    hist_avg = aman(commodity.get("rataPanen", 0.0), 1.0)
    prod_ratio = predicted_val / hist_avg
    if prod_ratio >= 1.10:
        score += 20
        reasons.append("✔ Hasil estimasi panen diproyeksikan sangat tinggi melebihi rerata musiman.")
    elif prod_ratio >= 0.90:
        score += 10
        reasons.append("✔ Hasil estimasi panen stabil pada standar musiman.")
    else:
        score += 0
        reasons.append("⚠️ Proyeksi volume produksi terindikasi mengalami penurunan.")
        
    # Klasifikasi Penentuan Status Akhir DSS
    if score >= 80:
        status = "🟢 Sangat Direkomendasikan"
    elif score >= 60:
        status = "🟢 Direkomendasikan"
    elif score >= 40:
        status = "🟡 Cukup"
    else:
        status = "🔴 Tidak Disarankan"
        
    return status, reasons, score


def generate_dynamic_analysis_report(commodity, form, predicted_val, pct_change):
    """
    FITUR 4: Struktur Analisis Otomatis (Offline Fallback).
    Membangun laporan analisis runut berdasarkan parameter input aktual pengguna.
    """
    trend_str = "meningkat" if pct_change >= 0 else "menurun"
    abs_pct = abs(pct_change)
    
    # Mengidentifikasi Faktor Pendukung
    suporting = []
    opt_temp = suhu_ideal_dari(commodity)
    
    if abs(form["suhuAvg"] - opt_temp) <= 2:
        suporting.append("✔ Suhu berada pada kondisi ideal untuk mendukung metabolisme tanaman.")
    else:
        suporting.append("✔ Pemanfaatan rekayasa media tanam menopang stabilitas tumbuh.")
        
    if form["luasPanenHabis"] > commodity["defaultForm"]["luasPanenHabis"] * 0.9:
        suporting.append("✔ Luas panen efektif mengalami peningkatan produktif.")
    if form["pupuk"] >= commodity["defaultForm"]["pupuk"] * 0.9:
        suporting.append("✔ Dosis pupuk mencukupi kebutuhan hara makro tanah.")
        
    # Mengidentifikasi Risiko
    risks = []
    if form["luasRusak"] > 0.3:
        risks.append("• Luas lahan rusak/puso mulai meningkat yang dapat menekan produktivitas.")
    else:
        risks.append("• Potensi fluktuasi cuaca ekstrem pegunungan Bandung Barat.")
        
    if form["hargaJual"] < commodity["defaultForm"]["hargaJual"] * 0.95:
        risks.append("• Harga jual di tingkat petani diperkirakan mengalami penurunan pasar.")
    else:
        risks.append("• Asimetri rantai pasar lokal wilayah Cisarua.")
        
    # Menentukan Rekomendasi Tindak Lanjut
    recs = []
    bulan_depan = commodity["prediksiDasar"][0]["month"]
    recs.append(f"✔ Mulai persiapan pengolahan tanah intensif untuk penanaman pada bulan {bulan_depan}.")
    recs.append("✔ Pertahankan formulasi dosis pupuk berimbang serta optimasi irigasi mikro.")
    recs.append("✔ Kurangi potensi kehilangan lahan produktif dengan pemantauan OPT secara berkala.")
    
    report = f"""**Analisis Produksi**

Produksi diperkirakan **{trend_str}** sebesar **{abs_pct}%** dibanding bulan sebelumnya.

**Faktor yang mendukung:**
{chr(10).join(suporting)}

**Risiko:**
{chr(10).join(risks)}

**Rekomendasi:**
{chr(10).join(recs)}"""
    return report


def show_shap(commodity, form):
    """
    Kontribusi fitur dari hasil SHAP yang dihitung di notebook (Bagian 16),
    dilengkapi uji sensitivitas langsung pada model untuk menunjukkan ARAH
    pengaruh di kondisi yang sedang diisi pengguna.
    """
    st.markdown("##### 🎯 Faktor yang paling mempengaruhi model (SHAP)")
    st.caption(
        "Diambil dari perhitungan SHAP di notebook penelitian. Batang panjang berarti "
        "fitur itu paling menentukan keputusan model — belum tentu menaikkan hasil."
    )

    nama_rapi = {
        "Produksi_kg": "Produksi bulan lalu", "Luas_Panen_ha": "Luas panen",
        "Suhu_Rata": "Suhu rata-rata", "Curah_Hujan": "Curah hujan",
        "Total_Pupuk_Kg": "Dosis pupuk", "bulan_sin": "Pola musim (sin)",
        "bulan_cos": "Pola musim (cos)", "lag1_produksi": "Panen 1 bulan sebelumnya",
        "rolling3_produksi": "Rata-rata 3 bulan terakhir",
    }
    shap_df = p.feature_importance().copy()
    shap_df["Fitur"] = shap_df["Fitur"].map(lambda x: nama_rapi.get(x, x))
    shap_df = shap_df.sort_values("Importance", ascending=True)

    shap_chart = (
        alt.Chart(shap_df)
        .mark_bar(color=GREEN, opacity=0.9, cornerRadiusTopRight=4, cornerRadiusBottomRight=4)
        .encode(
            y=alt.Y("Fitur:N", sort=None, title=None),
            x=alt.X("Importance:Q", title="Rata-rata |nilai SHAP|"),
            tooltip=["Fitur", alt.Tooltip("Importance:Q", format=".4f")],
        )
        .properties(height=280)
    )
    st.altair_chart(style_chart(shap_chart), use_container_width=True)

    st.markdown("##### ↕️ Arah pengaruh pada kondisi lahan kamu sekarang")
    st.caption(
        "Tiap faktor dinaikkan 10%, lalu model diminta memprediksi ulang. "
        "Batang hijau berarti menaikkan perkiraan panen, merah berarti menurunkan."
    )
    dasar, sens_df = sensitivitas_lokal(commodity, form)
    sens_df["Arah"] = sens_df["Dampak"].map(
        lambda v: "Menaikkan hasil" if v >= 0 else "Menurunkan hasil"
    )
    sens_df = sens_df.sort_values("Dampak", key=abs, ascending=True)

    sens_chart = (
        alt.Chart(sens_df)
        .mark_bar(cornerRadius=4)
        .encode(
            y=alt.Y("Fitur:N", sort=None, title=None),
            x=alt.X("Dampak:Q", title="Perubahan perkiraan panen (kg)"),
            color=alt.Color(
                "Arah:N", title=None,
                scale=alt.Scale(domain=["Menaikkan hasil", "Menurunkan hasil"],
                                range=[GREEN, CLAY]),
            ),
            tooltip=["Fitur", alt.Tooltip("Dampak:Q", format=",.0f")],
        )
        .properties(height=200)
    )
    st.altair_chart(style_chart(sens_chart), use_container_width=True)
    st.caption(
        f"Perkiraan dasar pada kondisi sekarang: {ribu(dasar)} kg. "
        "Dosis pupuk tampil nyaris tanpa pengaruh karena di data BPS nilainya tetap "
        "sepanjang tahun untuk tiap komoditas, sehingga model tidak punya variasi untuk dipelajari."
    )


def show_comparison_table(commodity):
    """Perbandingan panen sebenarnya dengan tebakan model, bulan per bulan."""
    st.markdown("##### ⚖️ Panen sebenarnya vs tebakan model LSTM")
    st.caption(
        "Untuk tiap bulan, model hanya diberi data 3 bulan sebelumnya lalu diminta "
        "menebak bulan tersebut — cara pengujian yang sama dengan di notebook penelitian."
    )

    history = commodity.get("history", [])
    if not history:
        st.info("Data perbandingan belum tersedia untuk komoditas ini.")
        return

    label_split = {"train": "Data latih", "val": "Data validasi", "test": "Data uji"}
    records = []
    for h in history:
        act, pred = h.get("actual", 0), h.get("predicted", 0)
        error = act - pred
        records.append(
            {
                "Bulan": h.get("month", "-"),
                "Panen sebenarnya (kg)": f"{act:,}".replace(",", "."),
                "Tebakan model (kg)": f"{pred:,}".replace(",", "."),
                "Selisih (kg)": f"{error:,}".replace(",", "."),
                "Meleset": f"{abs(error) / act * 100:.1f}%" if act > 0 else "—",
                "Kelompok": label_split.get(h.get("split", ""), "-"),
            }
        )

    st.dataframe(pd.DataFrame(records), use_container_width=True, hide_index=True)
    st.caption(
        "Tanda “—” berarti bulan itu memang tidak ada panen (nol), sehingga persentase "
        "meleset tidak bisa dihitung. Ini juga penyebab MAPE beberapa komoditas melonjak tinggi."
    )


# 4. Helper for calling Gemini AI
def generate_ai_insight(commodity, form, predicted_val, trend_status, pct_change, mape, r2, user_key=None):
    """
    Pembaruan FITUR 4: Dapatkan Analisis AI dengan standardisasi struktur luaran tetap sama
    baik saat online maupun offline.
    """
    api_key = user_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        try:
            api_key = st.secrets.get("GEMINI_API_KEY") or st.secrets.get("gemini", {}).get("api_key")
        except Exception:
            pass
            
    if not api_key:
        return generate_dynamic_analysis_report(commodity, form, predicted_val, pct_change)
        
    try:
        # Mencoba menggunakan google-genai (modern SDK)
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""
            Sebagai pakar data science pertanian di Kabupaten Bandung Barat, berikan analisis singkat dan rekomendasi spesifik untuk komoditas hortikultura berikut menggunakan struktur markdown ini secara tepat tanpa modifikasi judul section:

            **Analisis Produksi**
            Produksi diperkirakan [meningkat/menurun] sebesar {abs(pct_change)}% dibanding bulan sebelumnya.

            **Faktor yang mendukung:**
            ✔ [Faktor 1 terkait suhu ideal / luas lahan / pupuk]
            ✔ [Faktor 2]

            **Risiko:**
            • [Risiko 1 terkait kerusakan / fluktuasi harga / cuaca pegunungan]
            • [Risiko 2]

            **Rekomendasi:**
            ✔ [Rekomendasi 1 waktu tanam]
            ✔ [Rekomendasi 2 takaran pupuk/lahan]
            ✔ [Rekomendasi 3 mitigasi]

            Parameter data saat ini:
            - Komoditas: {commodity['name']}
            - Prediksi Volume: {predicted_val} kg
            - Persentase Perubahan: {pct_change}%
            - Suhu Rerata: {form.get('suhuAvg')} °C
            - Luas Rusak: {form.get('luasRusak')} ha
            - Takaran Pupuk: {form.get('pupuk')} kg
            - Media Tanam: {form.get('mediaTanam')}
            - MAPE Model LSTM: {mape}%
            - R² Model LSTM: {r2}

            Gunakan Bahasa Indonesia formal yang sangat rapi dan akademis/praktis.
            """
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text
        except ImportError:
            # Fallback jika hanya tersedia SDK lama google-generativeai
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""
            Sebagai pakar data science pertanian di Kabupaten Bandung Barat, berikan analisis singkat dan rekomendasi spesifik untuk komoditas hortikultura berikut menggunakan struktur markdown ini secara tepat tanpa modifikasi judul section:

            **Analisis Produksi**
            Produksi diperkirakan [meningkat/menurun] sebesar {abs(pct_change)}% dibanding bulan sebelumnya.

            **Faktor yang mendukung:**
            ✔ [Faktor 1 terkait suhu ideal / luas lahan / pupuk]
            ✔ [Faktor 2]

            **Risiko:**
            • [Risiko 1 terkait kerusakan / fluktuasi harga / cuaca pegunungan]
            • [Risiko 2]

            **Rekomendasi:**
            ✔ [Rekomendasi 1 waktu tanam]
            ✔ [Rekomendasi 2 takaran pupuk/lahan]
            ✔ [Rekomendasi 3 mitigasi]

            Parameter data saat ini:
            - Komoditas: {commodity['name']}
            - Prediksi Volume: {predicted_val} kg
            - Persentase Perubahan: {pct_change}%
            - Suhu Rerata: {form.get('suhuAvg')} °C
            - Luas Rusak: {form.get('luasRusak')} ha
            - Takaran Pupuk: {form.get('pupuk')} kg
            - Media Tanam: {form.get('mediaTanam')}
            - MAPE Model LSTM: {mape}%
            - R² Model LSTM: {r2}

            Gunakan Bahasa Indonesia formal yang sangat rapi dan akademis/praktis.
            """
            response = model.generate_content(prompt)
            return response.text
    except Exception as e:
        return f"Gagal mendapatkan insight AI karena kendala teknis: {str(e)}. Silakan periksa kredensial kunci API Anda."



# ====================================================================
# 5. PANEL KIRI — SEMUA KENDALI ADA DI SATU TEMPAT
# ====================================================================
with st.sidebar:
    html(
        '<div class="side-brand">🌱 AgroPredict</div>'
        '<div class="side-sub">Prediksi panen hortikultura<br>Kec. Cisarua, Bandung Barat</div>'
        '<hr class="rule" style="margin:16px 0 14px 0;">'
    )

    commodity_options = [f"{c['image']} {c['name']}" for c in COMMODITIES]
    selected_option = st.selectbox("Komoditas", commodity_options)
    selected_idx = commodity_options.index(selected_option)
    selected_commodity = COMMODITIES[selected_idx]
    default_form = selected_commodity["defaultForm"]
    c_id = selected_commodity["id"]

    html('<div class="eyebrow" style="margin:18px 0 2px 0;">Kondisi 3 bulan terakhir</div>')
    st.caption(
        "Model menebak panen bulan depan dari kondisi 3 bulan terakhir. "
        "Angka di bawah sudah terisi kondisi sebenarnya — ubah kalau mau "
        "mencoba skenario lain, lalu tekan tombol."
    )

    with st.form(key=f"form_{c_id}"):
        st.markdown("**Lahan (hektare)**")
        luas_panen = st.number_input(
            "Rata-rata luas dipanen (ha)", value=float(default_form["luasPanenHabis"]),
            min_value=0.0, step=0.1, key=f"lp_{c_id}",
            help="Rata-rata luas panen 3 bulan terakhir. Ini pendorong hasil terbesar.")
        luas_rusak = st.number_input(
            "Luas rusak / puso", value=float(default_form["luasRusak"]),
            min_value=0.0, step=0.1, key=f"lr_{c_id}",
            help="Lahan gagal karena hama, penyakit, atau cuaca.")
        luas_tanam = st.number_input(
            "Total lahan yang ditanami", value=float(default_form["luasTanamAkhir"]),
            min_value=0.1, step=0.1, key=f"lt_{c_id}",
            help="Dipakai untuk menghitung seberapa besar porsi lahan yang rusak.")

        st.markdown("**Perawatan**")
        pupuk_kg = st.number_input(
            "Dosis pupuk (kg)", value=float(default_form["pupuk"]),
            min_value=1.0, step=25.0, key=f"p_{c_id}")
        media_awal = default_form.get("mediaTanam", MEDIA_TANAH)
        media_tanam_val = st.selectbox(
            "Media tanam", MEDIA_OPSI,
            index=MEDIA_OPSI.index(media_awal) if media_awal in MEDIA_OPSI else 0,
            key=f"mt_{c_id}",
            help="Baglog dipakai untuk jamur; media kompos untuk bedengan sayuran.")

        st.markdown("**Cuaca & harga**")
        suhu_avg_val = st.slider(
            "Suhu rata-rata (°C)", min_value=10, max_value=35,
            value=int(default_form["suhuAvg"]), key=f"sa_{c_id}")
        curah_hujan_val = st.slider(
            "Curah hujan (mm)", min_value=0, max_value=600, step=10,
            value=int(default_form["curahHujan"]), key=f"ch_{c_id}")
        harga_jual_val = st.number_input(
            "Harga jual di petani (Rp/kg)", value=float(default_form["hargaJual"]),
            min_value=0.0, step=500.0, key=f"hj_{c_id}")

        st.write("")
        dihitung = st.form_submit_button(
            "🔮  Hitung prediksi", use_container_width=True, type="primary")

    if dihitung:
        st.success("Prediksi diperbarui.", icon="✅")

    api_key_input = ""  # analisis memakai mesin bawaan, tanpa layanan luar


# ====================================================================
# 6. PERHITUNGAN
# ====================================================================
form_inputs = {
    "luasTanamAkhir": luas_tanam,
    "luasPanenHabis": luas_panen,
    "luasPanenBelumHabis": 0.0,
    "luasRusak": luas_rusak,
    "luasTambahTanam": default_form.get("luasTambahTanam", 0.0),
    "pupuk": pupuk_kg,
    "mediaTanam": media_tanam_val,
    "suhuAvg": suhu_avg_val,
    "curahHujan": curah_hujan_val,
    "kecepatanAngin": default_form.get("kecepatanAngin", 3.5),
    "hargaJual": harga_jual_val,
}

if st.session_state.get("last_commodity") != c_id:
    st.session_state.last_commodity = c_id
    st.session_state.ai_insight = None

history_df = pd.DataFrame(selected_commodity["history"])
weather_df = pd.DataFrame(selected_commodity["weather"])
metrics = selected_commodity["metrics"]

predicted = calculate_simulation(selected_commodity, form_inputs)
last_month = selected_commodity["history"][-1]["month"]

# Pembanding memakai bulan panen terakhir yang tidak nol — hampir separuh baris
# data memang bernilai nol (bulan tanpa panen), dan itu tidak bisa jadi pembagi.
panen_pernah = [h["actual"] for h in selected_commodity["history"] if h["actual"] > 0]
last_actual = panen_pernah[-1] if panen_pernah else selected_commodity["rataPanen"]
basis_banding = aman(last_actual, aman(selected_commodity["rataPanen"], 1.0))
pct_change = round(((predicted - basis_banding) / basis_banding) * 100, 1)
trend = "Meningkat" if predicted > basis_banding else "Menurun"

hist_avg = aman(selected_commodity["rataPanen"], 1.0)
hist_max = history_df["actual"].max()
avg_temp = round(weather_df["temp"].mean(), 1)
accuracy_pct = round(max(0.0, 100.0 - metrics["mape"]), 1)
estimated_income = predicted * harga_jual_val

forecast_3m = predict_next_3_months(selected_commodity, form_inputs)
rec_status, rec_reasons, rec_score = calculate_recommendation(
    selected_commodity, form_inputs, predicted
)
pill_class, tone_color, tone_headline = tone_of(rec_status)

st.session_state.predicted_value = predicted
st.session_state.trend = trend
st.session_state.pct_change = pct_change


def level_of(value):
    """Menerjemahkan volume produksi ke tiga tingkat yang mudah dibaca."""
    if value > hist_avg * 1.10:
        return "Di atas rata-rata", GREEN, "pill-green"
    if value < hist_avg * 0.90:
        return "Di bawah rata-rata", CLAY, "pill-clay"
    return "Sekitar rata-rata", AMBER, "pill-amber"


level_text, level_color, level_pill = level_of(predicted)


# ====================================================================
# 6b. PERINGKAT SELURUH KOMODITAS
# --------------------------------------------------------------------
# Komoditas yang sedang dipilih memakai angka yang diisi pengguna;
# komoditas lain dinilai pada kondisi normalnya masing-masing.
# ====================================================================
# Komoditas lain memakai ramalan baseline yang sudah dihitung sekali di
# bangun_komoditas() — jadi menggeser slider tidak perlu menjalankan model
# 26 kali, cukup untuk komoditas yang sedang dibuka saja.
overview = []
for c in COMMODITIES:
    if c["id"] == c_id:
        c_form, c_pred, c_f3 = form_inputs, predicted, forecast_3m
    else:
        c_form = dict(c["defaultForm"])
        c_f3 = c["prediksiDasar"]
        c_pred = c_f3[0]["predicted"]
    c_status, c_reasons, c_score = calculate_recommendation(c, c_form, c_pred)
    c_panen = [h["actual"] for h in c["history"] if h["actual"] > 0]
    c_last = aman(c_panen[-1] if c_panen else c["rataPanen"], 1.0)
    overview.append({
        "id": c["id"],
        "nama": c["name"],
        "ikon": c["image"],
        "kategori": c["category"],
        "pred": c_pred,
        "skor": c_score,
        "status": c_status,
        "alasan": c_reasons,
        "selisih": round(((c_pred - c_last) / c_last) * 100, 1),
        "nilai": c_pred * c_form.get("hargaJual", c["defaultForm"]["hargaJual"]),
        "akurasi": round(max(0.0, 100.0 - c["metrics"]["mape"]), 1),
        "mape": c["metrics"]["mape"],
        "r2": c["metrics"]["r2"],
        "f3": c_f3,
    })

overview.sort(key=lambda x: (-x["skor"], -x["nilai"]))
top_pick = overview[0]
# Median dipakai, bukan rata-rata: beberapa komoditas ber-MAPE ekstrem
# (bulan tanpa panen) akan menyeret rata-rata jadi tidak mewakili.
avg_accuracy = AKURASI_MODEL


# ====================================================================
# 7. KEPALA HALAMAN
# ====================================================================
html(f"""
<div class="masthead">
    <div class="eyebrow"><span class="eyebrow-mark"></span>AgroPredict · Sistem pendukung keputusan panen</div>
    <h1>Komoditas mana yang paling layak untuk prediksi <em>bulan depan</em>?</h1>
    <p>Dashboard ini memakai model LSTM untuk memperkirakan hasil panen sayuran dan buah
    di Kecamatan Cisarua, lalu menerjemahkannya jadi saran tanam yang bisa langsung dipakai
    petani dan penyuluh — tanpa perlu membaca angka statistik.</p>
    <div class="chips">
        <span class="chip">📍 Cisarua, Kabupaten Bandung Barat</span>
        <span class="chip">🧠 Model LSTM</span>
        <span class="chip">🌿 {len(COMMODITIES)} komoditas hortikultura</span>
        <span class="chip">🎯 Median akurasi {avg_accuracy:.1f}%</span>
        <span class="chip">📊 Angka langsung dari model LSTM terlatih</span>
    </div>
</div>
<hr class="rule">
""")


# ====================================================================
# 7b. PAPAN PERINGKAT — jawaban lintas komoditas
# ====================================================================
b_col1, b_col2 = st.columns([5, 7], gap="medium")

with b_col1:
    top_tone_pill, top_tone_color, _ = tone_of(top_pick["status"])
    runner = overview[1]
    html(f"""
    <div class="pick">
        <p class="card-label" style="color:{GREEN};">Pilihan terbaik bulan depan</p>
        <div class="big">{top_pick['ikon']} {top_pick['nama']}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
            <span class="pill pill-green">Skor {top_pick['skor']}/100</span>
            <span class="pill pill-green">{ribu(top_pick['pred'])} kg</span>
        </div>
        <p class="plain" style="margin-top:0;">{top_pick['alasan'][0]}</p>
        <p class="plain">Pesaing terdekat: <strong>{runner['nama']}</strong> dengan skor
        {runner['skor']}. Kalau lahan dan modal cukup untuk dua komoditas, dua ini yang
        paling aman ditanam berdampingan.</p>
    </div>
    """)

with b_col2:
    layak = [o for o in overview if o["skor"] >= 60]
    total_nilai = sum(o["nilai"] for o in overview[:3])
    html(f"""
    <div class="card">
        <p class="card-label">Ringkasan prediksi bulan depan</p>
        <p class="plain" style="margin-top:6px;">
            Dari <strong>{len(overview)} komoditas</strong> yang dipantau,
            <strong>{len(layak)}</strong> di antaranya layak untuk prediksi bulan depan
            (skor 60 ke atas).
        </p>
        <p class="plain">
            Tiga teratas — <strong>{overview[0]['nama']}</strong>,
            <strong>{overview[1]['nama']}</strong>, dan
            <strong>{overview[2]['nama']}</strong> — kalau ditanam bersamaan
            diperkirakan bernilai <strong>{rupiah(total_nilai)}</strong>.
        </p>
        <p class="plain" style="font-size:0.78rem; color:{MUTED};">
            Tabel di bawah bisa digeser ke samping untuk melihat kolom selengkapnya.
        </p>
    </div>
    """)

st.write("")

if True:
    rows = ""
    for i, o in enumerate(overview, start=1):
        _, o_color, _ = tone_of(o["status"])
        klass = []
        if i == 1:
            klass.append("is-top")
        if o["id"] == c_id:
            klass.append("is-active")
        klass = f' class="{" ".join(klass)}"' if klass else ""
        arah = "▲" if o["selisih"] >= 0 else "▼"
        arah_warna = GREEN if o["selisih"] >= 0 else CLAY
        rows += f"""
        <tr{klass}>
            <td class="rank">{i:02d}</td>
            <td class="name">{o['ikon']} {o['nama']}<div class="cat">{o['kategori']}</div></td>
            <td>
                <div class="bar-wrap">
                    <div class="bar-track"><div class="bar-fill" style="width:{o['skor']}%; background:{o_color};"></div></div>
                    <span class="bar-num" style="color:{o_color};">{o['skor']}</span>
                </div>
            </td>
            <td class="mono">{ribu(o['pred'])} kg</td>
            <td class="mono" style="color:{arah_warna};">{arah} {abs(o['selisih'])}%</td>
            <td class="mono">{rupiah(o['nilai'])}</td>
            <td style="color:{o_color}; font-weight:700; font-size:0.8rem; white-space:nowrap;">{o['status']}</td>
        </tr>"""

    html(f"""
    <div class="board">
        <table>
            <thead><tr>
                <th></th><th>Komoditas</th><th>Skor kelayakan</th>
                <th style="text-align:right;">Perkiraan panen</th>
                <th style="text-align:right;">vs bulan lalu</th>
                <th style="text-align:right;">Nilai panen</th>
                <th>Saran</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>
    </div>
    """)
    st.caption(
        f"Diurutkan dari skor kelayakan tertinggi. Baris bergaris hijau di kiri adalah komoditas yang "
        f"sedang kamu buka ({selected_commodity['name']}) dan memakai angka yang kamu isi di panel kiri; "
        f"komoditas lain dinilai pada kondisi lahan normalnya masing-masing."
    )

    export_rows = []
    for i, o in enumerate(overview, start=1):
        row = {
            "Peringkat": i,
            "Komoditas": o["nama"],
            "Kategori": o["kategori"],
            "Skor kelayakan": o["skor"],
            "Saran tanam": o["status"].split(" ", 1)[-1],
            "Prediksi bulan depan (kg)": o["pred"],
            "Perubahan vs bulan lalu (%)": o["selisih"],
            "Perkiraan nilai panen (Rp)": int(o["nilai"]),
            "Akurasi model (%)": o["akurasi"],
            "MAPE (%)": o["mape"],
            "R2": o["r2"],
        }
        for f in o["f3"]:
            row[f"Prediksi {f['month']} (kg)"] = f["predicted"]
        row["Alasan utama"] = " ".join(o["alasan"])
        export_rows.append(row)

    board_csv = pd.DataFrame(export_rows).to_csv(index=False).encode("utf-8-sig")
    st.download_button(
        "⬇ Unduh perbandingan semua komoditas (CSV)", board_csv,
        file_name="perbandingan_komoditas_cisarua.csv", mime="text/csv")

html('<hr class="rule">')
st.markdown(f"### {selected_commodity['image']} Rincian {selected_commodity['name']}")
st.caption("Ganti komoditas lewat panel kiri untuk melihat rincian yang lain.")
st.write("")


# ====================================================================
# 8. KARTU VONIS — jawaban utama, sebelum semua grafik
# ====================================================================
v_col1, v_col2 = st.columns([6, 5], gap="medium")

with v_col1:
    reasons_html = "<br>".join(rec_reasons[:2])
    html(f"""
    <div class="verdict" style="border-left-color: {tone_color};">
        <div class="eyebrow">Saran untuk masa tanam berikutnya</div>
        <h2 style="color: {tone_color};">{rec_status}</h2>
        <p class="verdict-why">{reasons_html}</p>
        <div class="score-track">
            <div class="score-fill" style="width: {rec_score}%; background: {tone_color};"></div>
        </div>
        <div class="score-caption">Skor kelayakan {rec_score}/100 · dinilai dari suhu, pupuk, risiko lahan, dan proyeksi panen</div>
    </div>
    """)

with v_col2:
    arrow = "▲" if trend == "Meningkat" else "▼"
    trend_color = GREEN if trend == "Meningkat" else CLAY
    html(f"""
    <div class="card">
        <p class="card-label">Perkiraan panen bulan depan</p>
        <div><span class="num">{ribu(predicted)}</span><span class="unit">kg</span></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
            <span class="pill {pill_class if False else ('pill-green' if trend == 'Meningkat' else 'pill-clay')}">
                {arrow} {abs(pct_change)}% dibanding {last_month}
            </span>
            <span class="pill {level_pill}">{level_text}</span>
        </div>
        <p class="plain">Setara <strong>{rupiah(estimated_income)}</strong> bila terjual di harga
        {rupiah(harga_jual_val)}/kg. Rata-rata panen bulanan selama ini {ribu(hist_avg)} kg.</p>
    </div>
    """)

st.write("")

# Strip proyeksi 3 bulan
strip_items = ""
for item in forecast_3m:
    lvl_text, lvl_color, _ = level_of(item["predicted"])
    strip_items += f"""
    <div class="strip-item">
        <div class="m">{item['month']}</div>
        <div class="v" style="color:{lvl_color};">{ribu(item['predicted'])} <span style="font-size:0.8rem; color:var(--muted);">kg</span></div>
        <div style="font-size:0.72rem; color:var(--muted); margin-top:4px;">{lvl_text}</div>
    </div>"""
html(f'<div class="strip">{strip_items}</div>')

html('<hr class="rule">')


# ====================================================================
# 9. TAB UTAMA
# ====================================================================
tab_ringkas, tab_faktor, tab_data, tab_saran = st.tabs([
    "Ringkasan", "Apa yang mempengaruhi", "Data & akurasi", "Rencana tanam",
])


# ------------------------------ RINGKASAN ------------------------------
with tab_ringkas:
    st.write("")

    if predicted <= 0:
        st.info(
            f"Model memperkirakan **{selected_commodity['name']} tidak dipanen** "
            f"pada {forecast_3m[0]['month']}. Ini bukan error: hampir separuh baris "
            "data historis memang bernilai nol karena komoditas ini tidak dipanen "
            "setiap bulan, sehingga model ikut belajar memprediksi bulan kosong. "
            "Keluaran mentah model yang bernilai negatif dibulatkan ke nol, karena "
            "produksi tidak mungkin negatif.",
            icon="ℹ️",
        )
        st.write("")

    s1, s2, s3, s4 = st.columns(4, gap="small")
    tiles = [
        (s1, "Panen bulan depan", f"{ribu(predicted)} kg", f"{arrow} {abs(pct_change)}% dari bulan lalu"),
        (s2, "Nilai panen", rupiah(estimated_income), f"pada harga {rupiah(harga_jual_val)}/kg"),
        (s3, "Suhu rata-rata", f"{avg_temp} °C", "rekaman iklim Cisarua"),
        (s4, "Akurasi model", f"{accuracy_pct}%", f"meleset rata-rata {metrics['mape']}%"),
    ]
    for col, label, value, sub in tiles:
        with col:
            html(f"""
            <div class="card" style="padding:18px 20px;">
                <p class="card-label">{label}</p>
                <div class="num" style="font-size:1.5rem;">{value}</div>
                <p class="plain" style="margin-top:8px; font-size:0.76rem;">{sub}</p>
            </div>
            """)

    st.write("")
    r1, r2 = st.columns([7, 5], gap="medium")

    with r1:
        st.markdown("#### Panen tiga bulan ke depan")
        st.caption(
            "Model memakai hasil prediksi bulan pertama sebagai bahan untuk memprediksi bulan berikutnya, "
            "jadi semakin jauh ke depan semakin longgar perkiraannya."
        )
        plot_df = pd.DataFrame(forecast_3m)
        fig = go.Figure()
        fig.add_hline(y=hist_avg, line_dash="dot", line_color="#B9C4BC",
                      annotation_text="rata-rata historis", annotation_position="top left",
                      annotation_font_size=11, annotation_font_color=MUTED)
        fig.add_trace(go.Scatter(
            x=plot_df["month"], y=plot_df["predicted"],
            mode="lines+markers+text",
            text=[ribu(v) for v in plot_df["predicted"]],
            textposition="top center",
            textfont=dict(family="IBM Plex Mono", size=12, color=INK),
            marker=dict(size=11, color=GREEN, line=dict(width=2, color="white")),
            line=dict(color=GREEN, width=3, shape="spline"),
            name="Perkiraan panen",
        ))
        fig.update_layout(
            plot_bgcolor="white", paper_bgcolor="white", showlegend=False,
            margin=dict(l=10, r=20, t=30, b=10), height=280,
            font=dict(family="Instrument Sans", color=MUTED, size=12),
            xaxis=dict(showgrid=False, linecolor=LINE),
            yaxis=dict(showgrid=True, gridcolor="#EDF0EA", title="kg", zeroline=False),
        )
        st.plotly_chart(fig, use_container_width=True)

    with r2:
        st.markdown("#### Rinciannya")
        rows = ""
        for item in forecast_3m:
            lvl_text, lvl_color, _ = level_of(item["predicted"])
            rows += (
                f'<tr><td class="k">{item["month"]}</td>'
                f'<td class="v mono">{ribu(item["predicted"])} kg</td>'
                f'<td class="v" style="color:{lvl_color}; font-size:0.78rem;">{lvl_text}</td></tr>'
            )
        html(f"""
        <div class="card" style="padding:6px 8px;">
            <table class="clean">
                <thead><tr><th>Bulan</th><th style="text-align:right;">Perkiraan</th><th style="text-align:right;">Tingkat</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """)
        st.write("")
        best = max(forecast_3m, key=lambda x: x["predicted"])
        html(f"""
        <div class="note">
            <h5>Cara membaca ini</h5>
            <p>Bulan dengan perkiraan tertinggi adalah <strong>{best['month']}</strong>
            ({ribu(best['predicted'])} kg). Kalau kapasitas panen dan tenaga kerja terbatas,
            prioritaskan bulan tersebut. Angka “di bawah rata-rata” bukan berarti gagal —
            hanya lebih rendah dari kebiasaan panen komoditas ini.</p>
        </div>
        """)

        csv = pd.DataFrame(forecast_3m).rename(
            columns={"month": "Bulan", "predicted": "Prediksi (kg)"}
        ).to_csv(index=False).encode("utf-8")
        st.download_button("Unduh perkiraan (CSV)", csv,
                           file_name=f"prediksi_{c_id}.csv", mime="text/csv",
                           use_container_width=True)


# --------------------------- FAKTOR / SHAP ---------------------------
with tab_faktor:
    st.write("")
    st.markdown("#### Faktor apa yang menaikkan dan menurunkan perkiraan")
    st.caption(
        "Batang ke kanan menambah hasil panen, batang ke kiri menguranginya. "
        "Semakin panjang batangnya, semakin besar pengaruh faktor itu pada angka prediksi."
    )
    f1, f2 = st.columns([7, 5], gap="medium")

    with f1:
        show_shap(selected_commodity, form_inputs)

    with f2:
        opt_temp = suhu_ideal_dari(selected_commodity)
        temp_gap = round(suhu_avg_val - opt_temp, 1)
        if abs(temp_gap) <= 1.5:
            temp_msg = f"Suhu {suhu_avg_val}°C pas dengan suhu ideal {selected_commodity['name'].lower()} ({opt_temp}°C)."
            temp_class = ""
        else:
            arah = "lebih panas" if temp_gap > 0 else "lebih dingin"
            temp_msg = (f"Suhu {suhu_avg_val}°C terpaut {abs(temp_gap)}° {arah} dari suhu ideal "
                        f"{selected_commodity['name'].lower()} ({opt_temp}°C). Ini menahan hasil panen.")
            temp_class = " amber"

        rusak_ratio = luas_rusak / max(0.1, luas_tanam) * 100
        html(f"""
        <div class="note{temp_class}">
            <h5>Suhu</h5>
            <p>{temp_msg}</p>
        </div>
        """)
        st.write("")
        html(f"""
        <div class="note{'' if rusak_ratio < 5 else ' amber'}">
            <h5>Risiko lahan</h5>
            <p>{luas_rusak} ha dari {luas_tanam} ha rusak atau puso — sekitar
            <strong>{rusak_ratio:.1f}%</strong> lahan. Setiap hektare yang rusak memotong perkiraan
            panen jauh lebih besar daripada tambahan pupuk yang sama nilainya.</p>
        </div>
        """)
        st.write("")
        media_note = {
            MEDIA_TANAH: "Tanah adalah acuan dasar, sesuai kondisi data yang dipakai melatih model.",
            MEDIA_BAGLOG: ("Baglog atau media kompos dihitung menambah sekitar 10% dari hasil di tanah. "
                           "Penyesuaian ini dipasang di luar model, bukan hasil belajar LSTM."),
        }[media_tanam_val]
        html(f"""
        <div class="note indigo">
            <h5>Media tanam & pupuk</h5>
            <p>{media_note} Dosis pupuk {ribu(pupuk_kg)} kg
            ({pupuk_kg / default_form['pupuk'] * 100:.0f}% dari dosis anjuran). Menambah pupuk terus-menerus
            memberi tambahan hasil yang makin kecil, jadi kenaikan dosis tidak sebanding lurus dengan panen.</p>
        </div>
        """)


# ------------------------- DATA & AKURASI -------------------------
with tab_data:
    st.write("")
    d1, d2 = st.columns([7, 5], gap="medium")

    with d1:
        st.markdown("#### Panen sebenarnya vs tebakan model")
        st.caption("Semakin rapat kedua garis, semakin baik model mengikuti kenyataan di lapangan.")
        chart_data = history_df.melt(
            id_vars=["month"], value_vars=["actual", "predicted"],
            var_name="Data", value_name="Produksi (kg)")
        chart_data["Data"] = chart_data["Data"].map(
            {"actual": "Panen sebenarnya", "predicted": "Tebakan model"})
        line_chart = alt.Chart(chart_data).mark_line(point=True, strokeWidth=3).encode(
            x=alt.X("month:N", title=None, sort=None),
            y=alt.Y("Produksi (kg):Q", title="kg"),
            color=alt.Color("Data:N", title=None, scale=alt.Scale(
                domain=["Panen sebenarnya", "Tebakan model"], range=[GREEN, INDIGO])),
            tooltip=["month", "Data", "Produksi (kg)"],
        ).properties(height=320)
        st.altair_chart(style_chart(line_chart), use_container_width=True)

        st.write("")
        st.markdown("#### Suhu dan hasil panen")
        st.caption("Batang menunjukkan hasil panen, garis merah menunjukkan suhu bulan tersebut.")
        bars = alt.Chart(weather_df).mark_bar(
            color=GREEN, opacity=0.85, cornerRadiusTopLeft=6, cornerRadiusTopRight=6).encode(
            x=alt.X("month:N", title=None, sort=None),
            y=alt.Y("production:Q", title="Panen (kg)"),
            tooltip=["month", "temp", "production"])
        temp_line = alt.Chart(weather_df).mark_line(
            color=CLAY, point=alt.OverlayMarkDef(color=CLAY, size=45), strokeWidth=2.5).encode(
            x=alt.X("month:N", sort=None),
            y=alt.Y("temp:Q", title="Suhu (°C)"))
        layered = alt.layer(bars, temp_line).resolve_scale(y="independent").properties(height=300)
        st.altair_chart(style_chart(layered), use_container_width=True)

    with d2:
        st.markdown("#### Seberapa bisa dipercaya angkanya")
        html(f"""
        <div class="card">
            <p class="card-label">Rata-rata meleset (MAPE)</p>
            <div><span class="num">{metrics['mape']}%</span></div>
            <div class="score-track"><div class="score-fill" style="width:{min(100, metrics['mape'] * 5)}%; background:{GREEN};"></div></div>
            <p class="plain">Kalau panen sebenarnya 1.000 kg, tebakan model biasanya berjarak
            sekitar <strong>{metrics['mape'] * 10:.0f} kg</strong> dari angka itu
            (dihitung dari {metrics['n_uji']} bulan data uji).</p>
        </div>
        <div class="card">
            <p class="card-label">Ketepatan pola (R²) — seluruh model</p>
            <div><span class="num">{metrics['r2']}</span></div>
            <p class="plain">Model menjelaskan <strong>{metrics['r2'] * 100:.0f}%</strong> naik-turunnya
            produksi pada data uji. Sisanya {100 - metrics['r2'] * 100:.0f}% dipengaruhi hal di luar data,
            misalnya serangan hama mendadak. Angka ini dihitung untuk seluruh komoditas sekaligus.</p>
        </div>
        <div class="card">
            <p class="card-label">Selisih tipikal (RMSE)</p>
            <div><span class="num">{ribu(metrics['rmse'])}</span><span class="unit">kg</span></div>
            <p class="plain">Rata-rata jarak antara tebakan dan kenyataan tiap bulan, dihitung dengan
            memberi bobot lebih pada kesalahan besar.</p>
        </div>
        """)

        st.write("")
        rows = ""
        for kriteria, arti, warna in [
            ("&lt; 5%", "Sangat baik", GREEN),
            ("5–10%", "Baik", INDIGO),
            ("10–20%", "Cukup", AMBER),
            ("&gt; 20%", "Kurang", CLAY),
        ]:
            tanda = " ←" if (
                (kriteria == "&lt; 5%" and metrics["mape"] < 5)
                or (kriteria == "5–10%" and 5 <= metrics["mape"] <= 10)
                or (kriteria == "10–20%" and 10 < metrics["mape"] <= 20)
                or (kriteria == "&gt; 20%" and metrics["mape"] > 20)
            ) else ""
            rows += (f'<tr><td class="k mono">{kriteria}</td>'
                     f'<td class="v" style="color:{warna};">{arti}{tanda}</td></tr>')
        html(f"""
        <div class="card" style="padding:6px 8px;">
            <table class="clean">
                <thead><tr><th>Nilai MAPE</th><th style="text-align:right;">Penilaian</th></tr></thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
        """)

    if not metrics.get("mape_tersedia", True):
        st.warning(
            f"Seluruh bulan pada data uji {selected_commodity['name']} bernilai nol "
            "(tidak ada panen tercatat), jadi MAPE komoditas ini tidak bisa dihitung. "
            f"Angka {metrics['mape']}% di atas adalah median MAPE seluruh komoditas, "
            "dipakai sebagai perkiraan kasar saja.",
            icon="⚠️",
        )

    st.write("")
    html('<hr class="rule">')
    show_comparison_table(selected_commodity)
    html("""
    <div class="note indigo">
        <h5>Kenapa satuan kg penting</h5>
        <p>Pupuk dan hasil produksi sama-sama dicatat dalam kilogram supaya skalanya sebanding.
        Kalau satuannya campur aduk, model akan menganggap satu variabel jauh lebih penting hanya
        karena angkanya lebih besar, bukan karena pengaruhnya memang lebih besar.</p>
    </div>
    """)


# --------------------------- RENCANA TANAM ---------------------------
with tab_saran:
    st.write("")
    p1, p2 = st.columns([6, 6], gap="medium")

    with p1:
        st.markdown("#### Hasil penilaian kelayakan tanam")
        reasons_list = "".join(f"<li style='margin-bottom:7px;'>{r}</li>" for r in rec_reasons)
        html(f"""
        <div class="card" style="border-left:5px solid {tone_color};">
            <p class="card-label">{tone_headline}</p>
            <h3 style="margin:0 0 4px 0; font-size:1.4rem; color:{tone_color};">{rec_status}</h3>
            <div class="score-track"><div class="score-fill" style="width:{rec_score}%; background:{tone_color};"></div></div>
            <div class="score-caption">Skor {rec_score} dari 100</div>
            <ul class="plain" style="padding-left:18px; margin-top:14px;">{reasons_list}</ul>
        </div>
        """)

        st.write("")
        st.markdown("#### Ringkasan keputusan")
        best = max(forecast_3m, key=lambda x: x["predicted"])
        summary_rows = [
            ("Komoditas", f"{selected_commodity['image']} {selected_commodity['name']}"),
            ("Perkiraan bulan depan", f"{ribu(predicted)} kg"),
            ("Bulan terbaik", f"{best['month']} · {ribu(best['predicted'])} kg"),
            ("Panen tertinggi sejauh ini", f"{ribu(hist_max)} kg"),
            ("Perkiraan nilai panen", rupiah(estimated_income)),
            ("Akurasi model", f"{accuracy_pct}% (MAPE {metrics['mape']}%)"),
            ("Saran tanam", rec_status),
        ]
        body = "".join(f'<tr><td class="k">{k}</td><td class="v">{v}</td></tr>' for k, v in summary_rows)
        html(f'<div class="card" style="padding:6px 8px;"><table class="clean"><tbody>{body}</tbody></table></div>')

    with p2:
        st.markdown("#### Analisis tertulis")
        st.caption("Rangkuman kondisi, risiko, dan langkah lanjutan berdasarkan angka yang kamu masukkan.")
        if st.button("Buat analisis", use_container_width=True):
            with st.spinner("Menyusun analisis…"):
                st.session_state.ai_insight = generate_ai_insight(
                    commodity=selected_commodity, form=form_inputs, predicted_val=predicted,
                    trend_status=trend, pct_change=pct_change,
                    mape=metrics["mape"], r2=metrics["r2"], user_key=api_key_input)

        if st.session_state.get("ai_insight"):
            with st.container(border=True):
                st.markdown(st.session_state.ai_insight)
            st.download_button(
                "Unduh analisis (teks)", st.session_state.ai_insight.encode("utf-8"),
                file_name=f"analisis_{c_id}.md", mime="text/markdown", use_container_width=True)
        else:
            html("""
            <div class="note amber">
                <h5>Belum ada analisis</h5>
                <p>Tekan “Buat analisis” untuk menghasilkan uraian faktor pendukung, risiko, dan
                rekomendasi tindak lanjut. Tanpa kunci API, analisis tetap dibuat oleh mesin
                aturan bawaan aplikasi.</p>
            </div>
            """)


html('<hr class="rule">')
html("""
<div class="note">
    <h5>Batas penggunaan</h5>
    <p>Angka di dashboard ini adalah perkiraan dari model berbasis data historis,
    bukan jaminan hasil panen. Pakailah sebagai bahan pertimbangan bersama pengamatan
    lapangan dan saran penyuluh pertanian setempat.</p>
</div>
""")


# ====================================================================
# 10. KAKI HALAMAN
# ====================================================================
html('<hr class="rule">')
html("""
<div class="foot">
    <span>© 2026 · Penelitian skripsi — Kecamatan Cisarua, Kabupaten Bandung Barat</span>
    <span>Model LSTM · Data iklim Open-Meteo · Interpretasi SHAP</span>
</div>
""")
