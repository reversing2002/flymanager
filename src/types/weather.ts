export interface WeatherData {
  metar_id: number;
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | string | null;
  altim: number | null;
  slp: number | null;
  qcField: number | null;
  wxString: string | null;
  name: string;
  clouds: Array<{
    cover: string;
    base: number | null;
  }>;
  rawOb: string;
  rawTaf?: string;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  mostRecent: number;
}
