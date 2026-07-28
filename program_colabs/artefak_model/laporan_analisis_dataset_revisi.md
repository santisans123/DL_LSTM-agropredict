# Analisis Dataset Produksi Gabungan

- Sumber: `Data_Produksi_2023_2026_Gabungan.xlsx`
- Total baris: 1020
- Tahun: [2023, 2024, 2025, 2026]
- Komoditas unik setelah normalisasi nama: 28
- Baris produksi nol: 502 (49.2%)

## Komoditas bermasalah

Komoditas yang dipertahankan untuk modeling (punya histori cukup):

| Nama | n | positive | zero | zero_ratio |
| --- | --- | --- | --- | --- |
| Jamur Tiram | 39 | 4 | 35 | 0.8974358974358975 |
| Kacang Panjang | 39 | 4 | 35 | 0.8974358974358975 |
| Bawang Merah | 39 | 9 | 30 | 0.7692307692307693 |
| Bawang Putih | 39 | 9 | 30 | 0.7692307692307693 |
| Petsai/Sawi | 39 | 18 | 21 | 0.5384615384615384 |
| Kentang | 39 | 19 | 20 | 0.5128205128205128 |
| Mentimun | 39 | 24 | 15 | 0.38461538461538464 |
| Kangkung | 39 | 26 | 13 | 0.3333333333333333 |
| Wortel | 39 | 27 | 12 | 0.3076923076923077 |
| Paprika | 39 | 28 | 11 | 0.28205128205128205 |
| Terung | 39 | 28 | 11 | 0.28205128205128205 |
| Bayam | 39 | 29 | 10 | 0.2564102564102564 |
| Cabai Besar | 39 | 30 | 9 | 0.23076923076923078 |
| Cabai Keriting | 39 | 30 | 9 | 0.23076923076923078 |
| Cabai Rawit | 39 | 30 | 9 | 0.23076923076923078 |
| Labu Siam | 39 | 30 | 9 | 0.23076923076923078 |
| Tomat | 39 | 30 | 9 | 0.23076923076923078 |
| Kubis | 39 | 31 | 8 | 0.20512820512820512 |
| Buncis | 39 | 36 | 3 | 0.07692307692307693 |
| Bawang Daun | 39 | 38 | 1 | 0.02564102564102564 |
| Kembang Kol | 39 | 38 | 1 | 0.02564102564102564 |

Komoditas yang dibuang dari modeling karena terlalu tipis / all-zero:

| Nama | n | positive | zero | zero_ratio |
| --- | --- | --- | --- | --- |
| Kacang Merah | 3 | 0 | 3 | 1.0 |
| Lobak | 3 | 0 | 3 | 1.0 |
| Jamur Lainnya | 39 | 0 | 39 | 1.0 |
| Jamur Merang | 39 | 0 | 39 | 1.0 |
| Melon | 39 | 0 | 39 | 1.0 |
| Semangka | 39 | 0 | 39 | 1.0 |
| Stroberi | 39 | 0 | 39 | 1.0 |

## Komoditas paling rawan

Rasio nol tertinggi:

| Nama | n | positive | zero | zero_ratio |
| --- | --- | --- | --- | --- |
| Jamur Lainnya | 39 | 0 | 39 | 1.0 |
| Jamur Merang | 39 | 0 | 39 | 1.0 |
| Melon | 39 | 0 | 39 | 1.0 |
| Semangka | 39 | 0 | 39 | 1.0 |
| Stroberi | 39 | 0 | 39 | 1.0 |
| Kacang Merah | 3 | 0 | 3 | 1.0 |
| Lobak | 3 | 0 | 3 | 1.0 |
| Jamur Tiram | 39 | 4 | 35 | 0.8974358974358975 |
| Kacang Panjang | 39 | 4 | 35 | 0.8974358974358975 |
| Bawang Merah | 39 | 9 | 30 | 0.7692307692307693 |

Histori paling pendek / paling tipis:

| Nama | n | positive | zero | zero_ratio |
| --- | --- | --- | --- | --- |
| Kacang Merah | 3 | 0 | 3 | 1.0 |
| Lobak | 3 | 0 | 3 | 1.0 |
| Jamur Lainnya | 39 | 0 | 39 | 1.0 |
| Jamur Merang | 39 | 0 | 39 | 1.0 |
| Melon | 39 | 0 | 39 | 1.0 |
| Semangka | 39 | 0 | 39 | 1.0 |
| Stroberi | 39 | 0 | 39 | 1.0 |
| Jamur Tiram | 39 | 4 | 35 | 0.8974358974358975 |
| Kacang Panjang | 39 | 4 | 35 | 0.8974358974358975 |
| Bawang Merah | 39 | 9 | 30 | 0.7692307692307693 |

## Kesimpulan

- Dataset ini memang sangat sparsity-heavy: banyak komoditas bernilai 0 terus atau sangat sedikit observasinya.
- Dua komoditas hanya muncul 3 baris dan seluruhnya 0, sehingga hampir pasti merusak training MAPE.
- Untuk eksperimen LSTM ulang, gunakan CSV bersih dan pertimbangkan filtering komoditas tipis, transformasi log1p, dan pemodelan zero-inflated.