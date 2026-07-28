import { PredictionData, ModelMetrics, ProductionHistory, WeatherData } from './types';

export interface Commodity {
  id: string;
  name: string;
  category: 'Sayuran' | 'Buah-buahan';
  image: string;
  metrics: ModelMetrics;
  history: ProductionHistory[];
  weather: WeatherData[];
  defaultForm: PredictionData;
  pricePerKgRange: string;
}

export const COMMODITIES: Commodity[] = [
  {
    id: 'tomat',
    name: 'Tomat',
    category: 'Sayuran',
    image: '🍅',
    metrics: {
      mape: 4.2, // Sangat Baik
      rmse: 120.4,
      r2: 0.96 // Luar Biasa
    },
    history: [
      { month: 'Jan', actual: 4200, predicted: 4100 },
      { month: 'Feb', actual: 4500, predicted: 4400 },
      { month: 'Mar', actual: 4100, predicted: 4250 },
      { month: 'Apr', actual: 4800, predicted: 4700 },
      { month: 'May', actual: 5200, predicted: 5100 },
      { month: 'Jun', actual: 4900, predicted: 5000 },
    ],
    weather: [
      { month: 'Jan', temp: 22, production: 4200 },
      { month: 'Feb', temp: 23, production: 4500 },
      { month: 'Mar', temp: 21, production: 4100 },
      { month: 'Apr', temp: 24, production: 4800 },
      { month: 'May', temp: 25, production: 5200 },
    ],
    defaultForm: {
      luasTanamAkhir: 15.5,
      luasPanenHabis: 12.2,
      luasPanenBelumHabis: 3.3,
      luasRusak: 0.5,
      pupuk: 450,
      mediaTanam: 'Tanah',
      luasTambahTanam: 2.1,
      produksiHabis: 5000,
      produksiBelumHabis: 1200,
      hargaJual: 8500,
      suhuMax: 28,
      suhuMin: 18,
      suhuAvg: 23,
      kecepatanAngin: 4.2
    },
    pricePerKgRange: 'Rp 7.000 - Rp 10.000'
  },
  {
    id: 'cabai_merah',
    name: 'Cabai Merah',
    category: 'Sayuran',
    image: '🌶️',
    metrics: {
      mape: 7.8, // Baik
      rmse: 280.1,
      r2: 0.88 // Sangat baik
    },
    history: [
      { month: 'Jan', actual: 2100, predicted: 2250 },
      { month: 'Feb', actual: 2350, predicted: 2400 },
      { month: 'Mar', actual: 2800, predicted: 2650 },
      { month: 'Apr', actual: 3200, predicted: 3100 },
      { month: 'May', actual: 3000, predicted: 3050 },
      { month: 'Jun', actual: 3500, predicted: 3420 },
    ],
    weather: [
      { month: 'Jan', temp: 22, production: 2100 },
      { month: 'Feb', temp: 23, production: 2350 },
      { month: 'Mar', temp: 21, production: 2800 },
      { month: 'Apr', temp: 24, production: 3200 },
      { month: 'May', temp: 25, production: 3000 },
    ],
    defaultForm: {
      luasTanamAkhir: 8.2,
      luasPanenHabis: 6.5,
      luasPanenBelumHabis: 1.7,
      luasRusak: 0.3,
      pupuk: 600,
      mediaTanam: 'Tanah',
      luasTambahTanam: 1.5,
      produksiHabis: 2900,
      produksiBelumHabis: 800,
      hargaJual: 35000,
      suhuMax: 29,
      suhuMin: 19,
      suhuAvg: 24,
      kecepatanAngin: 3.8
    },
    pricePerKgRange: 'Rp 30.000 - Rp 45.000'
  },
  {
    id: 'kubis',
    name: 'Kubis',
    category: 'Sayuran',
    image: '🥬',
    metrics: {
      mape: 3.9, // Sangat baik
      rmse: 95.8,
      r2: 0.97 // Luar biasa
    },
    history: [
      { month: 'Jan', actual: 6100, predicted: 6000 },
      { month: 'Feb', actual: 6400, predicted: 6300 },
      { month: 'Mar', actual: 5900, predicted: 5950 },
      { month: 'Apr', actual: 6700, predicted: 6600 },
      { month: 'May', actual: 7200, predicted: 7150 },
      { month: 'Jun', actual: 6900, predicted: 6980 },
    ],
    weather: [
      { month: 'Jan', temp: 20, production: 6100 },
      { month: 'Feb', temp: 21, production: 6400 },
      { month: 'Mar', temp: 19, production: 5900 },
      { month: 'Apr', temp: 22, production: 6700 },
      { month: 'May', temp: 23, production: 7200 },
    ],
    defaultForm: {
      luasTanamAkhir: 20.1,
      luasPanenHabis: 18.0,
      luasPanenBelumHabis: 2.1,
      luasRusak: 0.1,
      pupuk: 350,
      mediaTanam: 'Tanah',
      luasTambahTanam: 3.0,
      produksiHabis: 6500,
      produksiBelumHabis: 900,
      hargaJual: 5500,
      suhuMax: 26,
      suhuMin: 15,
      suhuAvg: 21,
      kecepatanAngin: 4.5
    },
    pricePerKgRange: 'Rp 4.500 - Rp 6.500'
  },
  {
    id: 'kentang',
    name: 'Kentang',
    category: 'Sayuran',
    image: '🥔',
    metrics: {
      mape: 5.5, // Baik
      rmse: 154.2,
      r2: 0.92 // Sangat baik
    },
    history: [
      { month: 'Jan', actual: 3800, predicted: 3950 },
      { month: 'Feb', actual: 4100, predicted: 4000 },
      { month: 'Mar', actual: 4000, predicted: 4100 },
      { month: 'Apr', actual: 4500, predicted: 4350 },
      { month: 'May', actual: 4800, predicted: 4700 },
      { month: 'Jun', actual: 4600, predicted: 4550 },
    ],
    weather: [
      { month: 'Jan', temp: 19, production: 3800 },
      { month: 'Feb', temp: 20, production: 4100 },
      { month: 'Mar', temp: 18, production: 4000 },
      { month: 'Apr', temp: 21, production: 4500 },
      { month: 'May', temp: 22, production: 4800 },
    ],
    defaultForm: {
      luasTanamAkhir: 12.0,
      luasPanenHabis: 10.5,
      luasPanenBelumHabis: 1.5,
      luasRusak: 0.2,
      pupuk: 500,
      mediaTanam: 'Tanah',
      luasTambahTanam: 1.8,
      produksiHabis: 4200,
      produksiBelumHabis: 1050,
      hargaJual: 12000,
      suhuMax: 25,
      suhuMin: 14,
      suhuAvg: 19,
      kecepatanAngin: 3.5
    },
    pricePerKgRange: 'Rp 10.000 - Rp 14.000'
  },
  {
    id: 'wortel',
    name: 'Wortel',
    category: 'Sayuran',
    image: '🥕',
    metrics: {
      mape: 6.1, // Baik
      rmse: 112.9,
      r2: 0.91 // Sangat baik
    },
    history: [
      { month: 'Jan', actual: 3100, predicted: 3200 },
      { month: 'Feb', actual: 3400, predicted: 3300 },
      { month: 'Mar', actual: 3200, predicted: 3150 },
      { month: 'Apr', actual: 3700, predicted: 3600 },
      { month: 'May', actual: 3900, predicted: 3850 },
      { month: 'Jun', actual: 3800, predicted: 3750 },
    ],
    weather: [
      { month: 'Jan', temp: 19, production: 3100 },
      { month: 'Feb', temp: 20, production: 3400 },
      { month: 'Mar', temp: 18, production: 3200 },
      { month: 'Apr', temp: 21, production: 3700 },
      { month: 'May', temp: 21, production: 3900 },
    ],
    defaultForm: {
      luasTanamAkhir: 9.8,
      luasPanenHabis: 8.5,
      luasPanenBelumHabis: 1.3,
      luasRusak: 0.1,
      pupuk: 400,
      mediaTanam: 'Tanah',
      luasTambahTanam: 1.2,
      produksiHabis: 3500,
      produksiBelumHabis: 850,
      hargaJual: 7000,
      suhuMax: 25,
      suhuMin: 14,
      suhuAvg: 19,
      kecepatanAngin: 4.1
    },
    pricePerKgRange: 'Rp 6.000 - Rp 8.500'
  },
  {
    id: 'stroberi',
    name: 'Stroberi',
    category: 'Buah-buahan',
    image: '🍓',
    metrics: {
      mape: 9.4, // Baik
      rmse: 64.2,
      r2: 0.86 // Sangat baik
    },
    history: [
      { month: 'Jan', actual: 850, predicted: 910 },
      { month: 'Feb', actual: 980, predicted: 950 },
      { month: 'Mar', actual: 910, predicted: 930 },
      { month: 'Apr', actual: 1100, predicted: 1050 },
      { month: 'May', actual: 1250, predicted: 1200 },
      { month: 'Jun', actual: 1180, predicted: 1150 },
    ],
    weather: [
      { month: 'Jan', temp: 18, production: 850 },
      { month: 'Feb', temp: 19, production: 980 },
      { month: 'Mar', temp: 17, production: 910 },
      { month: 'Apr', temp: 20, production: 1100 },
      { month: 'May', temp: 20, production: 1250 },
    ],
    defaultForm: {
      luasTanamAkhir: 3.5,
      luasPanenHabis: 2.8,
      luasPanenBelumHabis: 0.7,
      luasRusak: 0.2,
      pupuk: 300,
      mediaTanam: 'Hidroponik',
      luasTambahTanam: 0.6,
      produksiHabis: 1100,
      produksiBelumHabis: 400,
      hargaJual: 35000,
      suhuMax: 24,
      suhuMin: 13,
      suhuAvg: 18,
      kecepatanAngin: 3.2
    },
    pricePerKgRange: 'Rp 30.000 - Rp 45.000'
  },
  {
    id: 'brokoli',
    name: 'Brokoli',
    category: 'Sayuran',
    image: '🥦',
    metrics: {
      mape: 5.1, // Baik
      rmse: 85.3,
      r2: 0.94 // Sangat baik
    },
    history: [
      { month: 'Jan', actual: 1900, predicted: 1820 },
      { month: 'Feb', actual: 2100, predicted: 2050 },
      { month: 'Mar', actual: 1850, predicted: 1920 },
      { month: 'Apr', actual: 2300, predicted: 2200 },
      { month: 'May', actual: 2500, predicted: 2450 },
      { month: 'Jun', actual: 2400, predicted: 2350 },
    ],
    weather: [
      { month: 'Jan', temp: 19, production: 1900 },
      { month: 'Feb', temp: 20, production: 2100 },
      { month: 'Mar', temp: 18, production: 1850 },
      { month: 'Apr', temp: 21, production: 2300 },
      { month: 'May', temp: 22, production: 2500 },
    ],
    defaultForm: {
      luasTanamAkhir: 6.2,
      luasPanenHabis: 5.1,
      luasPanenBelumHabis: 1.1,
      luasRusak: 0.1,
      pupuk: 450,
      mediaTanam: 'Rumah Kaca',
      luasTambahTanam: 0.8,
      produksiHabis: 2200,
      produksiBelumHabis: 600,
      hargaJual: 18000,
      suhuMax: 25,
      suhuMin: 14,
      suhuAvg: 19,
      kecepatanAngin: 3.9
    },
    pricePerKgRange: 'Rp 15.000 - Rp 22.000'
  }
];

export const MOCK_HISTORY: ProductionHistory[] = COMMODITIES[0].history;
export const MOCK_WEATHER_PROD: WeatherData[] = COMMODITIES[0].weather;
export const MOCK_METRICS: ModelMetrics = COMMODITIES[0].metrics;
export const INITIAL_PREDICTION_FORM: PredictionData = COMMODITIES[0].defaultForm;
