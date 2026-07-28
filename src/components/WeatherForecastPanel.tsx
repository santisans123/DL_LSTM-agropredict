import React, { useEffect, useState } from 'react';
import { CloudRain, ExternalLink, MapPin, Navigation, ThermometerSun } from 'lucide-react';

export interface WeatherForecast {
  source: string;
  location: string;
  latitude: number;
  longitude: number;
  period: string;
  temperatureMean: number;
  precipitationSum: number;
}

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface RegionOption {
  id: string;
  name: string;
}

const FALLBACK_PROVINCES: RegionOption[] = [
  { id: '32', name: 'Jawa Barat' },
  { id: '31', name: 'DKI Jakarta' },
  { id: '36', name: 'Banten' },
];

const FALLBACK_REGENCIES: Record<string, RegionOption[]> = {
  '32': [
    { id: '3217', name: 'Kabupaten Bandung Barat' },
    { id: '3273', name: 'Kota Bandung' },
    { id: '3204', name: 'Kabupaten Bandung' },
    { id: '3277', name: 'Kota Cimahi' },
  ],
  '31': [
    { id: '3171', name: 'Kota Jakarta Selatan' },
    { id: '3173', name: 'Kota Jakarta Pusat' },
    { id: '3174', name: 'Kota Jakarta Barat' },
  ],
  '36': [
    { id: '3671', name: 'Kota Tangerang' },
    { id: '3674', name: 'Kota Tangerang Selatan' },
    { id: '3603', name: 'Kabupaten Tangerang' },
  ],
};

const FALLBACK_DISTRICTS: Record<string, RegionOption[]> = {
  '3217': [
    { id: '3217130', name: 'Cisarua' },
    { id: '3217120', name: 'Parongpong' },
    { id: '3217110', name: 'Lembang' },
    { id: '3217140', name: 'Ngamprah' },
    { id: '3217150', name: 'Padalarang' },
  ],
  '3273': [
    { id: '3273010', name: 'Sukasari' },
    { id: '3273020', name: 'Coblong' },
    { id: '3273030', name: 'Cidadap' },
  ],
  '3204': [
    { id: '3204010', name: 'Ciwidey' },
    { id: '3204020', name: 'Rancabali' },
    { id: '3204030', name: 'Pasirjambu' },
  ],
  '3277': [
    { id: '3277010', name: 'Cimahi Selatan' },
    { id: '3277020', name: 'Cimahi Tengah' },
    { id: '3277030', name: 'Cimahi Utara' },
  ],
};

const CISARUA_DISTRICT_ID = '3217130';
const BANDUNG_BARAT_REGENCY_ID = '3217';

function preferCisarua(rows: RegionOption[]) {
  return [...rows].sort((a, b) => {
    const aCisarua = a.id === CISARUA_DISTRICT_ID || a.name.toLowerCase() === 'cisarua';
    const bCisarua = b.id === CISARUA_DISTRICT_ID || b.name.toLowerCase() === 'cisarua';
    if (aCisarua === bCisarua) return 0;
    return aCisarua ? -1 : 1;
  });
}

interface Props {
  forecast: WeatherForecast | null;
  loading: boolean;
  location: WeatherLocation;
  onLocationChange: (location: WeatherLocation) => void;
  onRefresh: () => void;
  onResetLocation: () => void;
}

export function WeatherForecastPanel({
  forecast,
  loading,
  location,
  onLocationChange,
  onRefresh,
  onResetLocation,
}: Props) {
  const [provinces, setProvinces] = useState<RegionOption[]>(FALLBACK_PROVINCES);
  const [regencies, setRegencies] = useState<RegionOption[]>(FALLBACK_REGENCIES['32']);
  const [districts, setDistricts] = useState<RegionOption[]>(FALLBACK_DISTRICTS['3217']);
  const [selectedProvince, setSelectedProvince] = useState('32');
  const [selectedRegency, setSelectedRegency] = useState('3217');
  const [selectedDistrict, setSelectedDistrict] = useState('3217130');
  const [selectedYears, setSelectedYears] = useState<number[]>([2025, 2026]);
  const [locating, setLocating] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);

  useEffect(() => {
    fetch('/api/regions/provinces')
      .then((res) => res.json())
      .then((data) => setProvinces(data.rows?.length ? data.rows : FALLBACK_PROVINCES))
      .catch(() => setProvinces(FALLBACK_PROVINCES));
  }, []);

  useEffect(() => {
    fetch(`/api/regions/regencies/${selectedProvince}`)
      .then((res) => res.json())
      .then((data) => {
        const rows = data.rows?.length ? data.rows : (FALLBACK_REGENCIES[selectedProvince] || FALLBACK_REGENCIES['32']);
        setRegencies(rows);
        if (!rows.some((row: RegionOption) => row.id === selectedRegency)) {
          setSelectedRegency(rows[0]?.id || '');
        }
      })
      .catch(() => setRegencies(FALLBACK_REGENCIES[selectedProvince] || FALLBACK_REGENCIES['32']));
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedRegency) return;
    fetch(`/api/regions/districts/${selectedRegency}`)
      .then((res) => res.json())
      .then((data) => {
        const sourceRows = data.rows?.length ? data.rows : (FALLBACK_DISTRICTS[selectedRegency] || FALLBACK_DISTRICTS['3217']);
        const rows = selectedRegency === BANDUNG_BARAT_REGENCY_ID ? preferCisarua(sourceRows) : sourceRows;
        setDistricts(rows);
        const cisarua = rows.find((row: RegionOption) => row.id === CISARUA_DISTRICT_ID || row.name.toLowerCase() === 'cisarua');
        if (selectedRegency === BANDUNG_BARAT_REGENCY_ID && cisarua) {
          setSelectedDistrict(cisarua.id);
        } else if (!rows.some((row: RegionOption) => row.id === selectedDistrict)) {
          setSelectedDistrict(rows[0]?.id || '');
        }
      })
      .catch(() => {
        const rows = selectedRegency === BANDUNG_BARAT_REGENCY_ID
          ? preferCisarua(FALLBACK_DISTRICTS[selectedRegency] || FALLBACK_DISTRICTS['3217'])
          : (FALLBACK_DISTRICTS[selectedRegency] || FALLBACK_DISTRICTS['3217']);
        setDistricts(rows);
        if (selectedRegency === BANDUNG_BARAT_REGENCY_ID) {
          setSelectedDistrict(CISARUA_DISTRICT_ID);
        }
      });
  }, [selectedRegency]);

  const applyAdministrativeLocation = async () => {
    const province = provinces.find((item) => item.id === selectedProvince);
    const regency = regencies.find((item) => item.id === selectedRegency);
    const district = districts.find((item) => item.id === selectedDistrict);
    if (!province || !regency || !district) return;

    const label = `${district.name}, ${regency.name}, ${province.name}`;
    setLocating(true);
    try {
      const resp = await fetch(`/api/location/search?q=${encodeURIComponent(`${label}, Indonesia`)}`);
      const data = await resp.json() as { rows?: WeatherLocation[] };
      const first = data.rows?.[0];
      onLocationChange(first || location);
      if (first) return;
    } catch (error) {
      console.warn('Administrative geocode failed:', error);
    } finally {
      setLocating(false);
    }
  };

  const resetToCisarua = () => {
    setSelectedProvince('32');
    setSelectedRegency('3217');
    setSelectedDistrict('3217130');
    setSelectedYears([2025, 2026]);
    onResetLocation();
  };

  const toggleYear = (year: number) => {
    setSelectedYears((current) =>
      current.includes(year)
        ? current.filter((item) => item !== year)
        : [...current, year].sort((a, b) => a - b)
    );
  };

  const downloadHistory = async () => {
    if (!selectedYears.length) return;
    setDownloadingHistory(true);
    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        years: selectedYears.join(','),
      });
      const resp = await fetch(`/api/weather/history?${params.toString()}`);
      if (!resp.ok) throw new Error('History belum bisa diunduh.');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `open_meteo_history_${selectedYears.join('_')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Download history failed:', error);
    } finally {
      setDownloadingHistory(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-black text-slate-900">Cuaca Otomatis Open-Meteo</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetToCisarua}
            disabled={loading}
            className="w-fit rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70"
          >
            Reset Cisarua
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="w-fit rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? 'Mengambil Cuaca...' : 'Ambil Cuaca Terbaru'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Provinsi</span>
              <select
                value={selectedProvince}
                onChange={(event) => setSelectedProvince(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                {provinces.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kab/Kota</span>
              <select
                value={selectedRegency}
                onChange={(event) => setSelectedRegency(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                {regencies.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kecamatan</span>
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                {districts.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={applyAdministrativeLocation}
            disabled={locating || !selectedDistrict}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            <Navigation size={16} />
            {locating ? 'Membuat Pin...' : 'Pakai Pin Lokasi Ini'}
          </button>
          <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
            Data wilayah diambil dari API wilayah Indonesia, lalu titik koordinat dibuat lewat pencarian peta.
          </p>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">History Tahunan Open-Meteo</p>
                <p className="text-xs font-medium text-slate-500">Pilih beberapa tahun untuk unduh data iklim historis.</p>
              </div>
              <button
                type="button"
                onClick={downloadHistory}
                disabled={!selectedYears.length || downloadingHistory}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadingHistory ? 'Mengunduh...' : 'Unduh History'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[2022, 2023, 2024, 2025, 2026].map((year) => {
                const active = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 min-h-[220px]">
          <iframe
            title="Google Maps lokasi cuaca"
            src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=12&output=embed`}
            className="h-full min-h-[220px] w-full border-0"
            loading="lazy"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <MapPin size={17} />
            <p className="text-[10px] font-black uppercase tracking-widest">Lokasi</p>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">{forecast?.location || 'Titik referensi cuaca Kecamatan Cisarua'}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {forecast ? `${forecast.latitude}, ${forecast.longitude}` : 'Koordinat referensi kecamatan'}
          </p>
          {forecast && (
            <a
              href={`https://www.google.com/maps?q=${forecast.latitude},${forecast.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-blue-700 hover:text-blue-800"
            >
              Buka Maps
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <ThermometerSun size={17} />
            <p className="text-[10px] font-black uppercase tracking-widest">Suhu Rata-rata</p>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{forecast?.temperatureMean ?? '-'} <span className="text-sm text-slate-500">°C</span></p>
          <p className="mt-1 text-xs font-medium text-slate-500">{forecast?.period || 'Menunggu request API'}</p>
        </div>

        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CloudRain size={17} />
            <p className="text-[10px] font-black uppercase tracking-widest">Curah Hujan</p>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{forecast?.precipitationSum ?? '-'} <span className="text-sm text-slate-500">mm</span></p>
          <p className="mt-1 text-xs font-medium text-slate-500">{forecast?.source || 'Open-Meteo API'}</p>
        </div>
      </div>
    </section>
  );
}
