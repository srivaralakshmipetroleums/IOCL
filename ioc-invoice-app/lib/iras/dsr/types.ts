export type IrasDsrProduct = "MS" | "HSD";

export interface IrasDsrCaptureJobMeta {
  month: number;
  year: number;
  product: IrasDsrProduct;
  label: string;
}

export type IrasDsrCaptureStatus = "idle" | "waiting" | "capturing" | "success" | "error";

export type IrasDsrRecord = Record<string, string | number | null | undefined>;

export interface IrasDsrParsedResponse {
  columns: unknown[];
  data: IrasDsrRecord[];
  totalCount: number;
}

export interface IrasDsrCaptureSummary {
  recordCount: number;
  firstDate: string | null;
  lastDate: string | null;
  totalCount: number;
}

export interface IrasDsrBatchProgress {
  active: boolean;
  totalJobs: number;
  completedJobs: number;
  currentJob: string | null;
  totalRecordsInserted: number;
  totalRecordsSkipped: number;
  failedJobs: string[];
}

export interface IrasDsrCaptureState {
  status: IrasDsrCaptureStatus;
  error: string | null;
  startedAt: string | null;
  capturedAt: string | null;
  savedCaptureId: string | null;
  recordsInserted: number | null;
  recordsSkipped: number | null;
  summary: IrasDsrCaptureSummary | null;
  result: IrasDsrParsedResponse | null;
  batch: IrasDsrBatchProgress | null;
  lastCaptureJob: string | null;
}

export interface IrasDsrStatusResponse {
  status: IrasDsrCaptureStatus;
  error: string | null;
  startedAt: string | null;
  capturedAt: string | null;
  savedCaptureId: string | null;
  recordsInserted: number | null;
  recordsSkipped: number | null;
  recordCount: number | null;
  firstDate: string | null;
  lastDate: string | null;
  totalCount: number | null;
  columns: unknown[] | null;
  records: IrasDsrRecord[] | null;
  batch: IrasDsrBatchProgress | null;
  browserOpen: boolean;
  lastCaptureJob: string | null;
}

export interface IrasDsrStoredCapture {
  id: string;
  capturedAt: string;
  totalCount: number | null;
  firstDsrDate: string | null;
  lastDsrDate: string | null;
  recordCount: number;
  columns: unknown[];
  rawResponse: unknown;
  product: IrasDsrProduct | null;
  reportMonth: number | null;
  reportYear: number | null;
}

export interface IrasDsrStoredRecordEntry {
  product: IrasDsrProduct | null;
  record: IrasDsrRecord;
}

export interface IrasDsrStoredData {
  latestCapture: IrasDsrStoredCapture | null;
  records: IrasDsrStoredRecordEntry[];
  summary: IrasDsrCaptureSummary | null;
}
