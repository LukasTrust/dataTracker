export interface Entry {
  id: number;
  datasetId: number;
  value: number;
  label: string;
  date: string; // ISO string (e.g., 2025-01-31 or RFC3339)
}
