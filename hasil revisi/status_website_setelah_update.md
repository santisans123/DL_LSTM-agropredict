# Status Website Setelah Update Revisi

File ini menjelaskan fitur revisi yang sekarang sudah benar-benar muncul di website React.

## Fitur yang Sudah Masuk ke Website

### 1. Prediksi Bulan Depan

Sudah tampil jelas di UI:

- tombol `Prediksi Bulan Depan`,
- kartu `Hasil Prediksi Produksi Bulan Depan`,
- keterangan `Target output: bulan depan`,
- tombol otomatis scroll ke hasil prediksi setelah diklik.

File terkait:

```text
src/App.tsx
src/components/ExecutiveSummary.tsx
src/components/PredictionForm.tsx
```

### 2. Open-Meteo API

Website sekarang memiliki panel:

```text
Cuaca Otomatis Open-Meteo
```

Saat tombol prediksi ditekan, sistem mengambil forecast dari endpoint:

```text
/api/weather/forecast
```

Data yang diambil:

- suhu rata-rata,
- curah hujan,
- periode forecast,
- sumber data.

Nilai suhu dan curah hujan juga dimasukkan ke form prediksi.

File terkait:

```text
server.ts
src/components/WeatherForecastPanel.tsx
src/components/PredictionForm.tsx
src/App.tsx
```

### 3. SHAP

Website sekarang menampilkan section:

```text
Explainable AI SHAP
```

Grafik SHAP mengambil data dari:

```text
artefak_model/shap_feature_importance.csv
```

melalui endpoint:

```text
/api/shap/feature-importance
```

File terkait:

```text
server.ts
src/components/ShapExplanation.tsx
```

### 4. Transparansi Sumber Data

Website sekarang menampilkan tabel:

```text
Transparansi Sumber Data
```

Tabel ini menjelaskan sumber untuk:

- produksi,
- luas panen,
- harga,
- suhu,
- curah hujan,
- prediksi produksi,
- rekomendasi,
- persentase kenaikan.

File terkait:

```text
src/components/DataSourceTable.tsx
src/App.tsx
```

### 5. Validasi Perhitungan Manual

Website sekarang menampilkan section:

```text
Validasi Perhitungan Manual
```

Bagian ini memperlihatkan rumus:

```text
((Prediksi Bulan Depan - Aktual Terakhir) / Aktual Terakhir) x 100%
```

Lalu menghitung contoh berdasarkan komoditas aktif.

File terkait:

```text
src/components/ManualValidation.tsx
src/App.tsx
```

## Fitur yang Masih Sebagian

### Upload Data Bulanan

UI upload sudah ada, tetapi file upload belum benar-benar diproses untuk memperbarui dataset historis.

### Hyperparameter 4 Layer

Script tuning 4 layer sudah ada, tetapi model aktif final perlu dilatih ulang jika ingin benar-benar mengganti model lama.

## Verifikasi

Perintah yang sudah dijalankan:

```bash
npm run lint
npm run build
```

Keduanya berhasil. Build hanya memberi warning ukuran bundle besar, bukan error.

