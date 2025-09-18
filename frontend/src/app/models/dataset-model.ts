export interface Dataset {
  id?: number;
  name: string;
  description: string;
  symbol: string;
  targetValue?: number | null;
  startDate?: string  | null;
  endDate?: string  | null;
}
