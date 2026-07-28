# Jawaban Pengembangan dan Revisi Sistem

Dokumen ini merapikan jawaban revisi berdasarkan kondisi project saat ini. Status dibagi menjadi:

- `Selesai`: sudah ada implementasi/artefak di project.
- `Sebagian`: sudah ada fondasi atau artefak, tetapi belum sepenuhnya terintegrasi di dashboard React.
- `Perlu Pengembangan`: belum menjadi fitur aktif dan perlu dikerjakan pada tahap berikutnya.

---

## 1. Optimalisasi Model Machine Learning

### 1.1 Penyimpanan Model

**Status: Selesai**

**Revisi:** Model LSTM yang telah selesai dilatih disimpan dalam format Pickle (`.pkl`) sehingga sistem dapat langsung memanggil model tanpa training ulang setiap kali aplikasi dijalankan.

**Jawaban:** Model LSTM sudah tersedia dalam format Pickle:

```text
artefak_model/lstm_model_terbaik.pkl
```

Selain itu, loader pada `predictor.py` sudah diperbaiki agar memprioritaskan file `.pkl`. Jika file `.pkl` tidak ditemukan, sistem akan menggunakan fallback model `.keras`.

**Bukti file:**

```text
predictor.py
export_model_pickle.py
artefak_model/lstm_model_terbaik.pkl
```

**Alasan:** Dengan pendekatan ini, aplikasi dapat memuat model siap inferensi secara langsung tanpa melakukan proses training ulang.

---

### 1.2 Optimasi Hyperparameter

**Status: Sebagian**

**Revisi:** Melakukan tuning hyperparameter untuk meningkatkan performa model, meliputi:

- Menurunkan learning rate menjadi `0.001` atau `0.0001`.
- Menguji arsitektur model dengan `4 layer LSTM`.
- Menyesuaikan dropout pada rentang `0.1-0.5`.

**Jawaban:** Script untuk tuning hyperparameter sudah disiapkan:

```text
train_lstm_hyperparameter_revisi.py
```

Script tersebut menguji:

- `learning_rate = 0.001`
- `learning_rate = 0.0001`
- arsitektur `4 layer LSTM`
- `dropout = 0.1, 0.2, 0.3, 0.4, 0.5`

**Catatan koreksi:** Berdasarkan `artefak_model/konfigurasi_model_final.json`, model aktif lama masih menggunakan:

```text
n_layer = 1
learning_rate = 0.001
dropout = 0.2
```

Artinya, learning rate dan dropout sudah sesuai rentang revisi, tetapi model aktif belum terbukti memakai 4 layer LSTM. Karena itu jawaban yang tepat adalah: script tuning sudah tersedia, tetapi training ulang model 4 layer perlu dijalankan untuk menghasilkan model final revisi.

**Output yang akan dihasilkan script tuning:**

```text
artefak_model/hasil_tuning_hyperparameter_revisi.csv
artefak_model/lstm_model_terbaik_revisi.keras
artefak_model/lstm_model_terbaik_revisi.pkl
artefak_model/konfigurasi_hyperparameter_revisi.json
```

---

### 1.3 Prediksi Bulan Mendatang

**Status: Selesai**

**Revisi:** Sistem harus melakukan prediksi untuk bulan berikutnya, bukan bulan yang sedang berjalan.

**Jawaban:** Backend sudah menggunakan konsep next month forecasting melalui fungsi:

```text
prediksi_bulan_berikutnya()
```

Pada `predictor.py`, periode prediksi dihitung dari bulan terakhir data historis lalu ditambah 1 bulan:

```python
periode = hist["Periode"].max() + pd.DateOffset(months=1)
```

**Hasil pengujian:** Ketika data historis terakhir berada pada Maret 2026, sistem menghasilkan prediksi untuk April 2026.

**Perbaikan tampilan:** Agar pengguna tidak bingung, label UI sudah diperjelas menjadi:

- `Prediksi Bulan Depan`
- `Hasil Prediksi Produksi Bulan Depan`
- `Target output: bulan depan`
- `Prediksi ini untuk bulan berikutnya, dihitung dari data historis sampai bulan terakhir.`

**Bukti file:**

```text
predictor.py
src/App.tsx
src/components/ExecutiveSummary.tsx
src/components/PredictionForm.tsx
src/components/CommoditySelector.tsx
app.py
```

---

## 2. Integrasi Data Cuaca Otomatis

### 2.1 Penggunaan Open-Meteo API

**Status: Perlu Pengembangan**

**Revisi:** Data cuaca tidak lagi dimasukkan secara manual, tetapi diperoleh otomatis melalui Open-Meteo API.

**Jawaban:** Saat ini data cuaca sudah menjadi bagian dari dataset dan digunakan sebagai fitur model, yaitu:

- `Suhu_Rata`
- `Curah_Hujan`

Namun pada dashboard React, data cuaca masih berasal dari data statis di `src/constants.ts`, bukan dari request Open-Meteo API secara langsung.

**Jawaban yang diperbaiki:** Integrasi Open-Meteo API perlu ditambahkan sebagai endpoint backend, misalnya:

```text
GET /api/weather/forecast
```

Endpoint tersebut mengambil suhu rata-rata dan curah hujan berdasarkan koordinat Kecamatan Cisarua, lalu mengirimkannya ke dashboard sebagai input prediksi bulan depan.

**Koordinat yang dapat digunakan untuk Kecamatan Cisarua, Bandung Barat:**

```text
latitude  = -6.816
longitude = 107.583
```

**Catatan:** Koordinat dapat disesuaikan lagi jika dosen meminta titik lokasi yang lebih spesifik.

---

### 2.2 Cara Kerja Integrasi Open-Meteo

**Status: Perlu Pengembangan**

**Jawaban:** Alur integrasi Open-Meteo yang disarankan:

1. Sistem menentukan lokasi Kecamatan Cisarua menggunakan latitude dan longitude.
2. Sistem mengirim request ke Open-Meteo API.
3. API mengembalikan data cuaca dalam format JSON.
4. Sistem mengambil suhu rata-rata dan curah hujan.
5. Data cuaca dikombinasikan dengan data historis produksi.
6. Model LSTM melakukan prediksi bulan berikutnya.

**Contoh endpoint Open-Meteo:**

```text
https://api.open-meteo.com/v1/forecast?latitude=-6.816&longitude=107.583&daily=temperature_2m_mean,precipitation_sum&timezone=Asia%2FJakarta
```

**Alasan:** Open-Meteo menyediakan data prakiraan cuaca tanpa scraping, sehingga lebih stabil dan mudah direplikasi dalam penelitian.

---

### 2.3 Otomatisasi Data Cuaca

**Status: Perlu Pengembangan**

**Jawaban:** Otomatisasi yang perlu diterapkan adalah:

- ketika pengguna menekan tombol `Prediksi Bulan Depan`,
- sistem otomatis mengambil forecast suhu dan curah hujan dari Open-Meteo,
- nilai tersebut masuk ke variabel prediksi,
- model LSTM menghitung prediksi bulan berikutnya.

**Catatan koreksi:** Pada `predictor.py` terdapat catatan bahwa simulasi saat ini menggunakan kondisi 3 bulan terakhir, bukan prakiraan cuaca bulan depan. Jadi untuk memenuhi revisi 2.3 secara penuh, perlu penambahan integrasi forecast Open-Meteo ke pipeline prediksi.

---

## 3. Pengembangan Dashboard UI/UX

### 3.1 Perbaikan Tampilan

**Status: Selesai**

**Revisi:** Mendesain ulang header agar lebih profesional seperti landing page aplikasi.

**Jawaban:** Header sudah didesain ulang menjadi lebih profesional dengan:

- logo aplikasi,
- nama aplikasi `Agro-LSTM Predictor`,
- lokasi penelitian,
- badge `Research Dashboard`,
- badge `LSTM RNN`,
- badge `7 Komoditas`,
- badge `Dashboard Prediksi`,
- area user/admin.

**Bukti file:**

```text
src/components/Header.tsx
```

**Revisi:** Menampilkan informasi utama pada bagian atas dashboard.

**Jawaban:** Informasi utama sudah dipindahkan ke bagian atas dashboard melalui komponen ringkasan.

**Bukti file:**

```text
src/components/ExecutiveSummary.tsx
src/App.tsx
```

---

### 3.2 Penyusunan Informasi

**Status: Selesai**

Bagian atas dashboard sudah menampilkan:

- hasil prediksi produksi bulan depan,
- rekomendasi,
- faktor yang memengaruhi hasil prediksi.

Bagian bawah dashboard sudah menampilkan:

- tabel komoditas,
- grafik historis,
- form prediksi,
- metodologi pra-pemrosesan,
- evaluasi model,
- informasi tambahan mengenai metrik `kg`.

**Bukti file:**

```text
src/components/ExecutiveSummary.tsx
src/components/CommodityTable.tsx
src/components/Charts.tsx
src/components/Evaluation.tsx
src/components/PredictionForm.tsx
```

---

### 3.3 Filter Komoditas

**Status: Selesai**

**Revisi:** Menambahkan fitur filter sehingga pengguna hanya melihat data komoditas yang dipilih tanpa harus menampilkan seluruh tabel.

**Jawaban:** Tabel komoditas sudah memiliki pilihan:

- `Komoditas Dipilih`
- `Semua`

Jika `Komoditas Dipilih` aktif, tabel hanya menampilkan komoditas yang sedang dipilih oleh pengguna.

**Bukti file:**

```text
src/components/CommodityTable.tsx
src/App.tsx
```

---

### 3.4 Upload Data Bulanan

**Status: Sebagian**

**Revisi:** Menyediakan fitur upload dataset setiap bulan agar data historis dapat diperbarui sebelum melakukan prediksi bulan berikutnya.

**Jawaban:** UI upload dataset bulanan sudah tersedia dan menerima file:

- `.csv`
- `.xlsx`
- `.xls`

**Bukti file:**

```text
src/components/MonthlyUpload.tsx
src/App.tsx
```

**Catatan koreksi:** Saat ini upload masih sebatas memilih file di UI dan menampilkan nama file aktif. File belum diproses untuk memperbarui dataset historis dan belum men-trigger retraining atau re-scaling data.

**Pengembangan lanjutan:** Agar revisi ini penuh, perlu dibuat endpoint backend untuk:

1. membaca file upload,
2. validasi kolom dataset,
3. menambahkan data ke histori,
4. memperbarui fitur lag/rolling,
5. menjalankan prediksi dengan data terbaru.

---

## 4. Pengembangan Data Dashboard

**Status: Sebagian**

**Revisi:** Menambahkan informasi pendukung berupa:

- harga komoditas per kilogram,
- produksi bulan sebelumnya,
- persentase kenaikan atau penurunan produksi,
- ikon indikator naik atau turun,
- perbandingan terhadap rata-rata produksi beberapa bulan sebelumnya.

**Jawaban:** Beberapa informasi pendukung sudah tersedia:

- Harga komoditas per kilogram tersedia di form dan tabel komoditas.
- Produksi bulan sebelumnya dipakai sebagai pembanding pada kartu hasil prediksi.
- Persentase kenaikan/penurunan produksi sudah ditampilkan pada ringkasan hasil.
- Ikon naik/turun sudah digunakan pada status prediksi.
- Rata-rata produksi beberapa bulan sebelumnya tersedia di backend Streamlit lama dan dapat dihitung dari data historis.

**Bukti file:**

```text
src/components/ExecutiveSummary.tsx
src/components/CommodityTable.tsx
src/components/StatCards.tsx
app.py
predictor.py
```

**Catatan koreksi:** Sumber harga pada project saat ini berasal dari dataset dan konstanta mock, belum otomatis diambil dari Kementerian Perdagangan. Jadi klaim sumber resmi Kemendag belum boleh ditulis sebagai fitur aktif kecuali integrasi sumber datanya ditambahkan.

**Jawaban yang aman untuk laporan:** Dashboard sudah menampilkan harga komoditas, produksi pembanding, status naik/turun, dan persentase perubahan. Integrasi harga otomatis dari sumber resmi seperti Kementerian Perdagangan dapat dijadikan pengembangan lanjutan.

---

## 5. Explainable AI SHAP

### 5.1 Implementasi SHAP

**Status: Sebagian**

**Revisi:** Menggunakan metode SHAP untuk menjelaskan hasil prediksi model LSTM.

**Jawaban:** Artefak SHAP sudah tersedia di folder model:

```text
artefak_model/shap_feature_importance.csv
artefak_model/shap_global_importance.png
artefak_model/shap_per_timestep.png
```

Backend Python juga sudah memiliki fungsi:

```text
feature_importance()
```

di `predictor.py` untuk membaca hasil SHAP.

**Catatan koreksi:** SHAP sudah tersedia pada artefak dan Streamlit lama, tetapi belum ditampilkan pada dashboard React sebagai komponen visual khusus.

---

### 5.2 Visualisasi SHAP

**Status: Sebagian**

**Jawaban:** Visualisasi SHAP sudah ada pada Streamlit lama melalui fungsi `show_shap()` di `app.py`. Grafik menggunakan data:

```text
artefak_model/shap_feature_importance.csv
```

Fitur yang dapat dijelaskan mencakup:

- produksi bulan sebelumnya,
- luas panen,
- suhu,
- curah hujan,
- pupuk,
- fitur bulan,
- rolling produksi.

**Pengembangan lanjutan:** Untuk dashboard React, perlu dibuat komponen baru misalnya:

```text
src/components/ShapExplanation.tsx
```

Komponen tersebut membaca data SHAP dari backend/API lalu menampilkan grafik kontribusi fitur.

---

### 5.3 Rekomendasi Otomatis

**Status: Sebagian**

**Jawaban:** Rekomendasi otomatis sudah tersedia pada backend Express melalui Gemini AI dan fallback lokal. Rekomendasi mempertimbangkan:

- hasil prediksi,
- metrik evaluasi model,
- nama komoditas,
- status tren naik/turun.

**Bukti file:**

```text
server.ts
src/components/ExecutiveSummary.tsx
```

**Catatan koreksi:** Rekomendasi saat ini belum secara eksplisit menggabungkan nilai SHAP. Agar memenuhi revisi sepenuhnya, rekomendasi perlu memasukkan fitur SHAP paling dominan sebagai alasan.

**Jawaban yang aman untuk laporan:** Rekomendasi sudah otomatis, tetapi integrasi SHAP ke alasan rekomendasi masih menjadi pengembangan lanjutan.

---

## 6. Validasi Hasil Prediksi

**Status: Sebagian**

**Revisi:** Setiap hasil prediksi harus memiliki dasar yang jelas.

**Jawaban:** Dashboard sudah menampilkan beberapa dasar prediksi:

- nilai prediksi produksi bulan depan,
- data aktual bulan terakhir,
- status naik/turun,
- persentase perubahan,
- faktor yang memengaruhi prediksi,
- metrik evaluasi model seperti MAPE, RMSE, dan R-Square.

**Bukti file:**

```text
src/components/ExecutiveSummary.tsx
src/components/Evaluation.tsx
src/components/Charts.tsx
```

**Catatan koreksi:** Validasi sudah cukup untuk menjelaskan hasil prediksi secara dashboard, tetapi untuk standar ilmiah yang lebih kuat perlu menambahkan:

- sumber setiap data,
- penjelasan fitur dominan SHAP per prediksi,
- alasan detail rekomendasi,
- contoh perhitungan manual.

---

## 7. Transparansi Sumber Data

**Status: Perlu Pengembangan**

**Revisi:** Setiap informasi pada dashboard harus memiliki keterangan sumbernya.

**Jawaban:** Tabel sumber data yang dapat digunakan dalam laporan:

| Informasi | Sumber |
| --- | --- |
| Produksi | Dataset BPP Kecamatan Cisarua |
| Luas Panen | Dataset BPP Kecamatan Cisarua |
| Harga | Dataset historis / rencana integrasi Kementerian Perdagangan |
| Suhu | Dataset cuaca historis / rencana Open-Meteo API |
| Curah Hujan | Dataset cuaca historis / rencana Open-Meteo API |
| Prediksi Produksi | Model LSTM |
| Rekomendasi | LSTM + Gemini AI fallback lokal; rencana integrasi SHAP |
| Persentase Kenaikan | Perhitungan sistem |
| MAPE, RMSE, R-Square | Hasil evaluasi model |

**Catatan koreksi:** Saat ini dashboard React belum menampilkan tabel sumber data khusus. Untuk memenuhi revisi ini secara penuh, perlu ditambahkan komponen:

```text
src/components/DataSourceTable.tsx
```

Komponen tersebut dapat diletakkan pada bagian bawah dashboard sebagai informasi transparansi.

---

## 8. Validasi Perhitungan Manual

**Status: Perlu Pengembangan**

**Revisi:** Pada Bab 3 disertakan contoh perhitungan manual yang menunjukkan bahwa proses sistem sesuai dengan logika perhitungan.

**Jawaban:** Contoh perhitungan manual yang dapat dimasukkan ke Bab 3:

### Contoh Logika Next Month Forecasting

Misalnya data historis terakhir tersedia sampai:

```text
Maret 2026
```

Maka sistem menentukan periode prediksi:

```text
Periode prediksi = Periode terakhir + 1 bulan
Periode prediksi = Maret 2026 + 1 bulan
Periode prediksi = April 2026
```

### Contoh Perhitungan Persentase Perubahan

Misalnya:

```text
Produksi aktual bulan terakhir = 6.900 kg
Prediksi bulan depan = 6.980 kg
```

Maka:

```text
Persentase perubahan = ((Prediksi - Aktual Terakhir) / Aktual Terakhir) x 100%
Persentase perubahan = ((6.980 - 6.900) / 6.900) x 100%
Persentase perubahan = 1,16%
```

Karena hasilnya positif, dashboard menampilkan status:

```text
Meningkat
```

### Contoh Perhitungan Luas Panen Efektif

Pada simulasi frontend, luas panen efektif dihitung dengan pendekatan:

```text
Luas efektif =
Luas Panen Habis
+ (0,4 x Luas Panen Belum Habis)
+ (0,1 x Luas Tambah Tanam)
- (0,8 x Luas Rusak)
```

Contoh:

```text
Luas Panen Habis       = 18,0 ha
Luas Panen Belum Habis = 2,1 ha
Luas Tambah Tanam      = 3,0 ha
Luas Rusak             = 0,1 ha
```

Maka:

```text
Luas efektif = 18,0 + (0,4 x 2,1) + (0,1 x 3,0) - (0,8 x 0,1)
Luas efektif = 18,0 + 0,84 + 0,30 - 0,08
Luas efektif = 19,06 ha
```

**Catatan:** Untuk laporan akhir, contoh perhitungan manual sebaiknya mengambil 1 komoditas asli dari dataset, lalu disesuaikan dengan tabel input yang digunakan pada Bab 3.

---

## Ringkasan Status Revisi

| No | Revisi | Status |
| --- | --- | --- |
| 1.1 | Penyimpanan model `.pkl` | Selesai |
| 1.2 | Tuning hyperparameter | Sebagian |
| 1.3 | Prediksi bulan mendatang | Selesai |
| 2.1 | Open-Meteo API | Perlu Pengembangan |
| 2.2 | Alur integrasi Open-Meteo | Perlu Pengembangan |
| 2.3 | Otomatisasi data cuaca | Perlu Pengembangan |
| 3.1 | Perbaikan tampilan | Selesai |
| 3.2 | Penyusunan informasi | Selesai |
| 3.3 | Filter komoditas | Selesai |
| 3.4 | Upload data bulanan | Sebagian |
| 4 | Pengembangan data dashboard | Sebagian |
| 5.1 | Implementasi SHAP | Sebagian |
| 5.2 | Visualisasi SHAP | Sebagian |
| 5.3 | Rekomendasi otomatis | Sebagian |
| 6 | Validasi hasil prediksi | Sebagian |
| 7 | Transparansi sumber data | Perlu Pengembangan |
| 8 | Validasi perhitungan manual | Perlu Pengembangan |

