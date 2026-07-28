"""
cek_model.py
============
Dashboard mini untuk MEMASTIKAN model sudah nyambung, sebelum menyentuh app.py.

Jalankan dari folder proyek Streamlit:
    streamlit run cek_model.py

Kalau halaman ini tampil dan grafiknya keluar, berarti artefak + predictor.py
sudah benar. Baru setelah itu integrasikan ke app.py.
"""

import pandas as pd
import streamlit as st

from predictor import muat_prediktor

st.set_page_config(page_title="Cek Model LSTM", page_icon="🌱", layout="wide")
st.title("🌱 Cek Koneksi Model LSTM")

# --- muat model (di-cache, hanya sekali) ---------------------------------
try:
    p = muat_prediktor()
except Exception as e:  # noqa: BLE001
    st.error(f"Gagal memuat artefak model:\n\n{e}")
    st.stop()

st.success(
    f"Model termuat. Encoding: **{p.encoding}** | timestep: **{p.timestep}** | "
    f"komoditas dikenali: **{len(p.daftar_komoditas)}**"
)

# --- kartu metrik --------------------------------------------------------
m = p.metrik_test()
c1, c2, c3, c4 = st.columns(4)
c1.metric("MAPE (test)", f"{m['MAPE']:.1f}%")
c2.metric("Median MAPE", f"{m['MedianMAPE']:.1f}%")
c3.metric("RMSE", f"{m['RMSE']:,.0f} kg")
c4.metric("R²", f"{m['R2']:.3f}")

# --- kontrol -------------------------------------------------------------
kiri, kanan = st.columns([1, 3])
with kiri:
    komoditas = st.selectbox("Komoditas", p.daftar_komoditas, index=0)
    n_bulan = st.slider("Ramalan berapa bulan ke depan?", 1, 12, 6)

# --- prediksi ------------------------------------------------------------
hist = p.riwayat(komoditas)
ramalan = p.prediksi_n_bulan(komoditas, n_bulan)

with kanan:
    satu = p.prediksi_bulan_berikutnya(komoditas)
    st.subheader(
        f"Prediksi {komoditas} — {satu['bulan']} {satu['tahun']}: "
        f"{satu['prediksi_kg']:,.0f} kg"
    )

    grafik = pd.concat(
        [
            hist[["Periode", "Produksi_kg"]].rename(
                columns={"Produksi_kg": "Aktual"}
            ),
            ramalan[["Periode", "Prediksi_kg"]].rename(
                columns={"Prediksi_kg": "Prediksi"}
            ),
        ]
    ).set_index("Periode")
    st.line_chart(grafik)

st.dataframe(ramalan, use_container_width=True, hide_index=True)

with st.expander("Kontribusi fitur (SHAP)"):
    st.dataframe(p.feature_importance(), use_container_width=True, hide_index=True)
