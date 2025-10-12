export class DateUtils {
  /** Convert various date strings to yyyy-MM-dd for <input type="date"> */
  static toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return String(value ?? '');
    }
  }

  /** Format a date as dd.mm.yyyy (German format). Accepts Date or date-like string. */
  static formatDE(value: Date | string | null | undefined): string {
    if (!value) return '';
    try {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}.${mm}.${yyyy}`;
    } catch {
      return String(value ?? '');
    }
  }

  /** Convert yyyy-MM-dd or other parseable date strings to ISO string for backend */
  static toISOString(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toISOString();
  }
}
