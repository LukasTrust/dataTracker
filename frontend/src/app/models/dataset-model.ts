export interface Dataset {
  id: number;
  name: string;
  description: string;
  symbol: string;
  targetValue?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}
