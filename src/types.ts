export interface PredictionData {
  luasTanamAkhir: number;
  luasPanenHabis: number;
  luasPanenBelumHabis: number;
  luasRusak: number;
  pupuk: number;
  mediaTanam: string;
  luasTambahTanam: number;
  produksiHabis: number;
  produksiBelumHabis: number;
  hargaJual: number;
  suhuMax: number;
  suhuMin: number;
  suhuAvg: number;
  curahHujan?: number;
  kecepatanAngin: number;
}

export interface ModelMetrics {
  mape: number;
  rmse: number;
  r2: number;
}

export interface CommodityMetricSummary {
  name: string;
  mape: number;
  source: string;
}

export interface ProductionHistory {
  month: string;
  actual: number;
  predicted: number;
}

export interface WeatherData {
  month: string;
  temp: number;
  production: number;
}

export type DatasetType = 'production' | 'weather' | 'fertilizer';

export interface DatasetUploadResult {
  valid: boolean;
  datasetType: DatasetType;
  fileName: string;
  rowsCount: number;
  missingColumns: string[];
  mappedColumns: Record<string, string>;
  previewRows: Array<Record<string, string | number | null>>;
  commodityOptions?: Array<{
    name: string;
    category: 'Sayuran' | 'Buah-buahan';
    price: number;
    productionKg: number;
    formPatch: Partial<PredictionData>;
    history?: ProductionHistory[];
  }>;
  appliedPatch: Partial<PredictionData>;
  message: string;
}

export interface AIInsightFactor {
  label: string;
  value: string | number;
  unit?: string;
  note: string;
}
