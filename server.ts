import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ROOT_DIR = process.cwd();
const PROJECT_DIR_CANDIDATES = [
  ROOT_DIR,
  path.resolve(ROOT_DIR, ".."),
  "/Users/santi/Documents/JOKI/joki-1376/revisi-agropredict-lstm-dashboard",
];
const resolveExistingDir = (...parts: string[]) => {
  for (const base of PROJECT_DIR_CANDIDATES) {
    const candidate = path.join(base, ...parts);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(ROOT_DIR, ...parts);
};
const ARTIFACT_DIR = resolveExistingDir("program_colabs", "artefak_model");
const LEGACY_ARTIFACT_DIR = resolveExistingDir("artefak_model");
const MODEL_FIGURE_WHITELIST = new Set([
  "loss_lstm_revisi.png",
  "loss_training.png",
  "shap_global_importance.png",
  "aktual_vs_prediksi.png",
  "residual_plot.png",
  "shap_per_timestep.png",
]);

const DATASET_TEMPLATES: Record<string, { filename: string; headers: string[]; sample: Array<string | number> }> = {
  production: {
    filename: "template_data_produksi_bulanan.csv",
    headers: [
      "Tahun",
      "Bulan",
      "Kode",
      "Nama Komoditas",
      "Luas Tan Akhir",
      "Luas Panen Habis",
      "Luas Panen Belum Habis",
      "Luas Rusak",
      "Luas Tambah Tanam",
      "Produksi Habis (Kw)",
      "Produksi Belum Habis (Kw)",
      "Harga Jual Petani (Rp/Kg)",
    ],
    sample: [2026, "Juli", "TMT", "Tomat", 15.5, 12.2, 3.3, 0.5, 2.1, 50, 12, 8500],
  },
  weather: {
    filename: "template_data_cuaca_bulanan.csv",
    headers: [
      "Tahun",
      "Bulan",
      "Suhu Maks (°C)",
      "Suhu Min (°C)",
      "Suhu Rata-rata (°C)",
      "Kec. Angin Maks (km/h)",
      "Curah Hujan (mm)",
    ],
    sample: [2026, "Juli", 26.2, 19.8, 22.2, 18.0, 282.1],
  },
  fertilizer: {
    filename: "template_data_pupuk.csv",
    headers: [
      "Jenis_Tanaman",
      "Kategori",
      "Total_Pupuk_Kg",
      "Urea_Kg",
      "ZA_Kg",
      "SP36_Kg",
      "KCl_Kg",
      "NPK_Mutiara_Kg",
    ],
    sample: ["Tomat", "Sayuran", 450, 120, 50, 80, 40, 160],
  },
};

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function readCsvRows(csvPath: string) {
  const raw = fs.readFileSync(csvPath, 'utf-8').trim();
  if (!raw) return [];
  const lines = raw.split(new RegExp('\r?\n'));
  const headers = lines[0].split(',').map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, cols[index]?.trim() ?? '']));
  });
}

function computeCommodityMetrics(csvPath: string, sourceLabel: string) {
  const rows = readCsvRows(csvPath);
  const grouped = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const split = String(row.split || '').toLowerCase();
    if (split && split !== 'test') continue;
    const name = String(row.Nama || '').trim();
    const actual = Number(row.aktual);
    const prediksi = Number(row.prediksi);
    if (!name || !Number.isFinite(actual) || !Number.isFinite(prediksi) || actual === 0) continue;
    const current = grouped.get(name) || { sum: 0, count: 0 };
    current.sum += Math.abs((actual - prediksi) / actual) * 100;
    current.count += 1;
    grouped.set(name, current);
  }
  return [...grouped.entries()].map(([name, item]) => ({
    name,
    mape: Number((item.sum / item.count).toFixed(2)),
    source: sourceLabel,
  }));
}

function safeParseInsightPayload(text: string) {
  const tryParse = (input: string) => {
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  };

  const direct = tryParse(text.trim());
  if (direct) return direct;

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    const parsed = tryParse(match[0]);
    if (parsed) return parsed;
  }

  return null;
}

function runDatasetParser(filePath: string, datasetType: string, commodity: string) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    execFile(
      "python3",
      ["parse_uploaded_dataset.py", filePath, datasetType, commodity],
      { cwd: ROOT_DIR, timeout: 20000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(parseError);
        }
      }
    );
  });
}

const FALLBACK_PROVINCES = [
  { id: "32", name: "Jawa Barat" },
  { id: "31", name: "DKI Jakarta" },
  { id: "36", name: "Banten" },
];

const FALLBACK_REGENCIES_BY_PROVINCE: Record<string, Array<{ id: string; name: string }>> = {
  "32": [
    { id: "3217", name: "Kabupaten Bandung Barat" },
    { id: "3273", name: "Kota Bandung" },
    { id: "3204", name: "Kabupaten Bandung" },
    { id: "3277", name: "Kota Cimahi" },
  ],
  "31": [
    { id: "3171", name: "Kota Jakarta Selatan" },
    { id: "3173", name: "Kota Jakarta Pusat" },
    { id: "3174", name: "Kota Jakarta Barat" },
  ],
  "36": [
    { id: "3671", name: "Kota Tangerang" },
    { id: "3674", name: "Kota Tangerang Selatan" },
    { id: "3603", name: "Kabupaten Tangerang" },
  ],
};

const FALLBACK_DISTRICTS_BY_REGENCY: Record<string, Array<{ id: string; name: string }>> = {
  "3217": [
    { id: "3217130", name: "Cisarua" },
    { id: "3217120", name: "Parongpong" },
    { id: "3217110", name: "Lembang" },
    { id: "3217140", name: "Ngamprah" },
    { id: "3217150", name: "Padalarang" },
  ],
  "3273": [
    { id: "3273010", name: "Sukasari" },
    { id: "3273020", name: "Coblong" },
    { id: "3273030", name: "Cidadap" },
  ],
  "3204": [
    { id: "3204010", name: "Ciwidey" },
    { id: "3204020", name: "Rancabali" },
    { id: "3204030", name: "Pasirjambu" },
  ],
  "3277": [
    { id: "3277010", name: "Cimahi Selatan" },
    { id: "3277020", name: "Cimahi Tengah" },
    { id: "3277030", name: "Cimahi Utara" },
  ],
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use("/program_colabs/artefak_model", express.static(ARTIFACT_DIR));
  app.use("/artefak_model", express.static(LEGACY_ARTIFACT_DIR));

  app.get("/api/dataset/template/:type", (req, res) => {
    const template = DATASET_TEMPLATES[req.params.type];
    if (!template) {
      res.status(404).json({ error: "Tipe template tidak tersedia." });
      return;
    }
    const csv = [
      template.headers.map(csvEscape).join(","),
      template.sample.map(csvEscape).join(","),
    ].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${template.filename}"`);
    res.send(csv);
  });

  app.post("/api/dataset/preview", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
    const datasetType = String(req.header("x-dataset-type") || "");
    const fileName = String(req.header("x-file-name") || "upload.xlsx").replace(/[^a-zA-Z0-9._-]/g, "_");
    const commodity = String(req.header("x-commodity-name") || "");
    if (!DATASET_TEMPLATES[datasetType]) {
      res.status(400).json({ error: "Tipe dataset tidak valid." });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "File belum terkirim." });
      return;
    }

    const tempPath = path.join(os.tmpdir(), `agro-upload-${Date.now()}-${fileName}`);
    try {
      fs.writeFileSync(tempPath, req.body);
      const result = await runDatasetParser(tempPath, datasetType, commodity);
      res.json({ ...result, fileName });
    } catch (error) {
      console.error("Dataset preview failed:", error);
      res.status(400).json({
        error: "File belum bisa diproses. Pastikan format kolom sesuai template dan file tidak rusak.",
      });
    } finally {
      fs.rm(tempPath, { force: true }, () => {});
    }
  });

  app.get("/api/artifacts/:file", (req, res) => {
    const file = req.params.file;
    if (!MODEL_FIGURE_WHITELIST.has(file)) {
      res.status(404).json({ error: "File artefak tidak tersedia." });
      return;
    }

    const candidates = [path.join(ARTIFACT_DIR, file), path.join(LEGACY_ARTIFACT_DIR, file)];
    const fullPath = candidates.find((p) => fs.existsSync(p));
    if (!fullPath) {
      res.status(404).json({ error: "Artefak belum ditemukan di server." });
      return;
    }

    res.sendFile(fullPath);
  });

  app.get("/api/model/evaluation", (_req, res) => {
    try {
      const csvCandidates = [
        path.join(ARTIFACT_DIR, "tabel_evaluasi_final.csv"),
        path.join(LEGACY_ARTIFACT_DIR, "tabel_evaluasi_final.csv"),
      ];
      const csvPath = csvCandidates.find((p) => fs.existsSync(p));
      if (!csvPath) {
        throw new Error("tabel_evaluasi_final.csv not found");
      }

      const lines = fs.readFileSync(csvPath, "utf-8").trim().split(new RegExp("\\r?\\n"));
      const headers = lines[0].split(",").map((item) => item.trim());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",");
        return Object.fromEntries(headers.map((header, index) => [header, cols[index]?.trim() ?? ""]));
      });
      const test = rows.find((row) => String(row.split || "").toLowerCase() === "test") || rows[rows.length - 1];

      res.json({
        source: "program_colabs/artefak_model/tabel_evaluasi_final.csv",
        split: test.split || "Test",
        mape: Number(Number(test["MAPE(%)"]).toFixed(2)),
        rmse: Number(Number(test["RMSE(kg)"]).toFixed(2)),
        r2: Number(Number(test.R2).toFixed(3)),
        rows: rows.map((row) => ({
          split: row.split,
          mape: Number(Number(row["MAPE(%)"]).toFixed(2)),
          rmse: Number(Number(row["RMSE(kg)"]).toFixed(2)),
          r2: Number(Number(row.R2).toFixed(3)),
        })),
      });
    } catch (error) {
      console.warn("Evaluation file read failed:", error);
      res.json({
        source: "Fallback statis constants.ts",
        split: "Test",
        mape: 4.2,
        rmse: 120.4,
        r2: 0.96,
        rows: [],
      });
    }
  });

  app.get("/api/model/commodity-metrics", (_req, res) => {
    try {
      const sourcePriority = [
        { file: path.join(ARTIFACT_DIR, "hasil_prediksi_test.csv"), label: "program_colabs/artefak_model/hasil_prediksi_test.csv" },
        { file: path.join(ARTIFACT_DIR, "hasil_prediksi_ensemble_revisi.csv"), label: "program_colabs/artefak_model/hasil_prediksi_ensemble_revisi.csv" },
        { file: path.join(ARTIFACT_DIR, "hasil_prediksi_lstm_revisi.csv"), label: "program_colabs/artefak_model/hasil_prediksi_lstm_revisi.csv" },
      ];
      const availableSources = sourcePriority.filter((item) => fs.existsSync(item.file));
      if (!availableSources.length) {
        throw new Error("hasil_prediksi_*.csv not found");
      }

      const seen = new Map<string, { name: string; mape: number; source: string }>();
      for (const src of availableSources) {
        for (const item of computeCommodityMetrics(src.file, src.label)) {
          if (!seen.has(item.name)) seen.set(item.name, item);
        }
      }

      res.json({
        source: availableSources.map((item) => item.label).join(' + '),
        items: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'id')),
      });
    } catch (error) {
      console.warn("Commodity metrics read failed:", error);
      res.json({ source: "Fallback statis constants.ts", artifactDir: ARTIFACT_DIR, items: [] });
    }
  });

  // Gemini API setup
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { predictionData, evaluationMetrics, commodityName } = req.body;
      
      const prompt = `
        Sebagai pakar data science pertanian di Kabupaten Bandung Barat, berikan output HANYA JSON valid untuk prediksi komoditas hortikultura berikut:
        - Komoditas: ${commodityName || 'Tanaman Sayuran/Buah'}
        - Prediksi Produksi Bulan Berikutnya: ${predictionData.value} kg
        - Status Tren: ${predictionData.status}
        - Akurasi Model LSTM (MAPE): ${evaluationMetrics.mape}%
        - R-Square: ${evaluationMetrics.r2}
        
        Format JSON wajib:
        {
          "insights": "teks analisis singkat dengan bullet markdown",
          "factors": [
            { "label": "string", "value": "string atau number", "unit": "string", "note": "string" }
          ]
        }
        
        Isi factors minimal 4 item dan fokus pada faktor yang benar-benar memengaruhi hasil: luas panen efektif, dosis pupuk, suhu rata-rata, curah hujan, angin maksimum, atau faktor relevan lain.
        Gunakan bahasa Indonesia yang profesional, ringkas, dan memotivasi akademis/praktis.
      `;

      let insightsText = "";
      let factors: Array<{ label: string; value: string | number; unit?: string; note: string }> = [];

      if (process.env.GEMINI_API_KEY) {
        try {
          const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });
          const parsed = result.text ? safeParseInsightPayload(result.text) : null;
          if (parsed?.insights) {
            insightsText = String(parsed.insights);
            if (Array.isArray(parsed.factors)) {
              factors = parsed.factors
                .filter((item: any) => item && item.label && item.note)
                .slice(0, 5)
                .map((item: any) => ({
                  label: String(item.label),
                  value: item.value ?? '',
                  unit: item.unit ? String(item.unit) : '',
                  note: String(item.note),
                }));
            }
          } else {
            insightsText = result.text || "";
          }
        } catch (geminiError) {
          console.warn("Gemini API call failed, using high-quality local fallback:", geminiError);
        }
      }

      // If Gemini was skipped, failed, or returned empty, generate a gorgeous localized professional fallback
      if (!insightsText) {
        const trendText = predictionData.status === "Meningkat" ? "peningkatan" : "penurunan";
        insightsText = `**Analisis Prediktif Hortikultura Kecamatan Cisarua:**\n\n` +
          `* **Manajemen Nutrisi & Tanah**: Berdasarkan prediksi LSTM yang menunjukkan tren **${trendText}** sebesar **${predictionData.value.toLocaleString('id-ID')} kg**, direkomendasikan aplikasi pupuk hara makro secara presisi guna memperkuat kesuburan tanah pegunungan.\n` +
          `* **Intervensi Iklim Mikro**: Manfaatkan temperatur rata-rata kawasan Cisarua yang sejuk untuk meminimalkan deviasi hasil rill dengan merujuk pada standar eror model (MAPE ${evaluationMetrics.mape}%).\n` +
          `* **Optimalisasi Lahan Efektif**: Atur rotasi tanam secara berkala guna mempertahankan daya dukung lahan dan stabilitas nilai R-Square (${evaluationMetrics.r2}) model prediksi.`;
        factors = [
          {
            label: "Luas Panen Efektif",
            value: predictionData.value,
            unit: "kg",
            note: "Menjadi dasar utama estimasi hasil bulan berikutnya.",
          },
          {
            label: "Dosis Pupuk",
            value: predictionData.pupuk,
            unit: "kg",
            note: "Pengaturan pupuk yang presisi menjaga stabilitas hasil.",
          },
          {
            label: "Suhu Rata-rata",
            value: predictionData.suhuAvg,
            unit: "°C",
            note: "Iklim sejuk Cisarua ikut membentuk performa model.",
          },
          {
            label: "Curah Hujan",
            value: predictionData.curahHujan ?? 0,
            unit: "mm",
            note: "Dibaca dari Open-Meteo saat prediksi dijalankan.",
          },
        ];
      }

      if (!factors.length) {
        factors = [
          {
            label: "Luas Panen Efektif",
            value: predictionData.value,
            unit: "kg",
            note: "Menjadi dasar utama estimasi hasil bulan berikutnya.",
          },
          {
            label: "Dosis Pupuk",
            value: predictionData.pupuk,
            unit: "kg",
            note: "Pengaturan pupuk yang presisi menjaga stabilitas hasil.",
          },
          {
            label: "Suhu Rata-rata",
            value: predictionData.suhuAvg,
            unit: "°C",
            note: "Iklim sejuk Cisarua ikut membentuk performa model.",
          },
          {
            label: "Curah Hujan",
            value: predictionData.curahHujan ?? 0,
            unit: "mm",
            note: "Dibaca dari Open-Meteo saat prediksi dijalankan.",
          },
        ];
      }

      res.json({ insights: insightsText, factors });
    } catch (error) {
      console.error("General API Error:", error);
      // Return a safe fallback instead of throwing 500
      try {
        const { predictionData, evaluationMetrics } = req.body;
        const trendText = predictionData?.status === "Meningkat" ? "peningkatan" : "penurunan";
        const val = predictionData?.value ? predictionData.value.toLocaleString('id-ID') : "0";
        const mape = evaluationMetrics?.mape || "5.0";
        res.json({
          insights: `**Analisis Prediktif Hortikultura Kecamatan Cisarua:**\n\n` +
            `* **Manajemen Nutrisi & Tanah**: Berdasarkan estimasi model LSTM yang menunjukkan tren **${trendText}** (${val} kg), direkomendasikan penyelarasan hara makro pada tanah.\n` +
            `* **Adaptasi Iklim Mikro**: Sesuaikan pola tanam pegunungan Bandung Barat dengan tingkat akurasi historis model (MAPE ${mape}%).\n` +
            `* **Tata Kelola Panen**: Lakukan pencatatan berkelanjutan untuk meningkatkan keandalan sistem kecerdasan buatan.`,
          factors: []
        });
      } catch (innerErr) {
        res.json({
          insights: `**Analisis Prediktif Hortikultura Kecamatan Cisarua:**\n\n` +
            `* **Rekomendasi Berbasis Model**: Optimalkan penggunaan input hara tanah (pupuk) dan pantau kestabilan debit air.\n` +
            `* **Mitigasi Deviasi**: Terapkan metode penanaman modern seperti rumah kaca atau mulsa plastik untuk menekan galat produksi.`,
          factors: []
        });
      }
    }
  });

  app.get("/api/weather/forecast", async (req, res) => {
    const latitude = Number(req.query.latitude ?? -6.8159);
    const longitude = Number(req.query.longitude ?? 107.5535);
    const locationName = typeof req.query.location === "string" && req.query.location.trim()
      ? req.query.location.trim()
      : "Titik referensi cuaca Kecamatan Cisarua, Kabupaten Bandung Barat";

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ error: "Latitude dan longitude harus berupa angka." });
      return;
    }
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", latitude.toString());
    url.searchParams.set("longitude", longitude.toString());
    url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", "Asia/Jakarta");

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);
      const data = await response.json() as {
        daily?: {
          time?: string[];
          temperature_2m_mean?: number[];
          precipitation_sum?: number[];
        };
      };

      const dates = data.daily?.time || [];
      const temps = data.daily?.temperature_2m_mean || [];
      const rains = data.daily?.precipitation_sum || [];
      const avg = (values: number[]) => values.length
        ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
        : 0;

      res.json({
        source: "Open-Meteo API",
        location: locationName,
        latitude,
        longitude,
        period: dates.length ? `${dates[0]} s.d. ${dates[dates.length - 1]}` : "Forecast 16 hari",
        temperatureMean: Number(avg(temps).toFixed(1)),
        precipitationSum: Number(rains.reduce((sum, value) => sum + Number(value || 0), 0).toFixed(1)),
        daily: dates.map((date, index) => ({
          date,
          temperature: temps[index],
          precipitation: rains[index],
        })),
      });
    } catch (error) {
      console.warn("Open-Meteo fetch failed, returning local fallback:", error);
      res.json({
        source: "Fallback lokal saat Open-Meteo tidak tersedia",
        location: locationName,
        latitude,
        longitude,
        period: "Estimasi lokal",
        temperatureMean: 22.4,
        precipitationSum: 86.5,
        daily: [],
      });
    }
  });

  app.get("/api/weather/history", async (req, res) => {
    const latitude = Number(req.query.latitude ?? -6.8159);
    const longitude = Number(req.query.longitude ?? 107.5535);
    const yearsParam = typeof req.query.years === "string" && req.query.years.trim()
      ? req.query.years
      : "";
    const years = yearsParam
      ? yearsParam.split(",").map((year) => Number(year.trim())).filter((year) => Number.isFinite(year))
      : [new Date().getFullYear() - 1, new Date().getFullYear()];

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      res.status(400).json({ error: "Latitude dan longitude harus berupa angka." });
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const allRows: Array<Record<string, string | number>> = [];
    try {
      for (const year of years) {
        const isCurrentOrFutureYear = year >= today.getFullYear();
        const endDate = isCurrentOrFutureYear ? todayStr : `${year}-12-31`;
        const startDate = `${year}-01-01`;
        if (isCurrentOrFutureYear && startDate > endDate) continue;

        const url = new URL("https://archive-api.open-meteo.com/v1/archive");
        url.searchParams.set("latitude", latitude.toString());
        url.searchParams.set("longitude", longitude.toString());
        url.searchParams.set("start_date", startDate);
        url.searchParams.set("end_date", endDate);
        url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum,wind_speed_10m_max");
        url.searchParams.set("timezone", "Asia/Jakarta");

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo archive error: ${response.status}`);
        const data = await response.json() as {
          daily?: {
            time?: string[];
            temperature_2m_mean?: number[];
            precipitation_sum?: number[];
            wind_speed_10m_max?: number[];
          };
        };

        const dates = data.daily?.time || [];
        const temps = data.daily?.temperature_2m_mean || [];
        const rains = data.daily?.precipitation_sum || [];
        const winds = data.daily?.wind_speed_10m_max || [];
        dates.forEach((date, index) => {
          allRows.push({
            year,
            date,
            temperature_mean: temps[index] ?? "",
            precipitation_sum: rains[index] ?? "",
            wind_speed_max: winds[index] ?? "",
          });
        });
      }

      const headers = ["year", "date", "temperature_mean", "precipitation_sum", "wind_speed_max"];
      const csv = [
        headers.join(","),
        ...allRows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="open_meteo_history_${years.join("_")}.csv"`);
      res.send(csv);
    } catch (error) {
      console.warn("Open-Meteo history fetch failed:", error);
      res.status(500).json({ error: "History Open-Meteo belum bisa diunduh saat ini." });
    }
  });

  app.get("/api/location/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 3) {
      res.json({ source: "OpenStreetMap Nominatim", rows: [] });
      return;
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "id");
    url.searchParams.set("accept-language", "id");

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Agro-LSTM-Predictor/1.0 (research dashboard)",
        },
      });
      if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
      const data = await response.json() as Array<{
        display_name: string;
        lat: string;
        lon: string;
        type?: string;
        category?: string;
      }>;

      res.json({
        source: "OpenStreetMap Nominatim",
        rows: data.map((item) => ({
          name: item.display_name,
          latitude: Number(item.lat),
          longitude: Number(item.lon),
          type: item.type || item.category || "location",
        })),
      });
    } catch (error) {
      console.warn("Location search failed:", error);
      res.json({
        source: "Fallback lokal",
        rows: [
          {
            name: "Titik referensi cuaca Kecamatan Cisarua, Kabupaten Bandung Barat",
            latitude: -6.8159,
            longitude: 107.5535,
            type: "default",
          },
        ],
      });
    }
  });

  app.get("/api/regions/provinces", async (_req, res) => {
    try {
      const response = await fetch("https://wilayah.web.id/api/provinces?limit=100");
      if (!response.ok) throw new Error(`Region API error: ${response.status}`);
      const payload = await response.json() as { data?: Array<{ code: string; name: string }> };
      const rows = (payload.data || []).map((item) => ({ id: item.code, name: item.name }));
      res.json({
        source: "wilayah.web.id",
        rows: rows.length ? rows : FALLBACK_PROVINCES,
      });
    } catch (error) {
      console.warn("Province fetch failed:", error);
      res.json({
        source: "Fallback lokal",
        rows: FALLBACK_PROVINCES,
      });
    }
  });

  app.get("/api/regions/regencies/:provinceId", async (req, res) => {
    try {
      const response = await fetch(`https://wilayah.web.id/api/regencies/${req.params.provinceId}?limit=100`);
      if (!response.ok) throw new Error(`Region API error: ${response.status}`);
      const payload = await response.json() as { data?: Array<{ code: string; name: string }> };
      const fallbackRows = FALLBACK_REGENCIES_BY_PROVINCE[req.params.provinceId] || FALLBACK_REGENCIES_BY_PROVINCE["32"];
      const rows = (payload.data || []).map((item) => ({ id: item.code, name: item.name }));
      res.json({
        source: "wilayah.web.id",
        rows: rows.length ? rows : fallbackRows,
      });
    } catch (error) {
      console.warn("Regency fetch failed:", error);
      res.json({
        source: "Fallback lokal",
        rows: FALLBACK_REGENCIES_BY_PROVINCE[req.params.provinceId] || FALLBACK_REGENCIES_BY_PROVINCE["32"],
      });
    }
  });

  app.get("/api/regions/districts/:regencyId", async (req, res) => {
    try {
      const response = await fetch(`https://wilayah.web.id/api/districts/${req.params.regencyId}?limit=100`);
      if (!response.ok) throw new Error(`Region API error: ${response.status}`);
      const payload = await response.json() as { data?: Array<{ code: string; name: string }> };
      const fallbackRows = FALLBACK_DISTRICTS_BY_REGENCY[req.params.regencyId] || FALLBACK_DISTRICTS_BY_REGENCY["3217"];
      const rows = (payload.data || []).map((item) => ({ id: item.code, name: item.name }));
      res.json({
        source: "wilayah.web.id",
        rows: rows.length ? rows : fallbackRows,
      });
    } catch (error) {
      console.warn("District fetch failed:", error);
      res.json({
        source: "Fallback lokal",
        rows: FALLBACK_DISTRICTS_BY_REGENCY[req.params.regencyId] || FALLBACK_DISTRICTS_BY_REGENCY["3217"],
      });
    }
  });

  app.get("/api/shap/feature-importance", (_req, res) => {
    try {
      const csvCandidates = [
        path.join(process.cwd(), "program_colabs", "artefak_model", "shap_feature_importance.csv"),
        path.join(process.cwd(), "artefak_model", "shap_feature_importance.csv"),
      ];
      const csvPath = csvCandidates.find((p) => fs.existsSync(p));
      if (!csvPath) {
        throw new Error("shap_feature_importance.csv not found");
      }
      const rows = fs.readFileSync(csvPath, "utf-8")
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((line) => {
          const [feature, importance] = line.split(",");
          return {
            feature,
            label: feature
              .replace(/_/g, " ")
              .replace("kg", "kg")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
            importance: Number(importance),
          };
        })
        .filter((row) => row.feature && Number.isFinite(row.importance))
        .sort((a, b) => b.importance - a.importance);

      res.json({
        source: "SHAP feature importance hasil notebook penelitian",
        rows,
      });
    } catch (error) {
      console.warn("SHAP file read failed:", error);
      res.json({
        source: "Fallback lokal",
        rows: [
          { feature: "Suhu_Rata", label: "Suhu Rata", importance: 0.0409 },
          { feature: "bulan_cos", label: "Bulan Cos", importance: 0.0253 },
          { feature: "Luas_Panen_ha", label: "Luas Panen Ha", importance: 0.0239 },
        ],
      });
    }
  });

  app.use("/program_colabs", express.static(path.join(ROOT_DIR, "program_colabs")));
  app.use("/artefak_model", express.static(path.join(ROOT_DIR, "artefak_model")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
