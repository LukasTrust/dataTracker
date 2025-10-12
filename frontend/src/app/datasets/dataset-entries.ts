import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {filter, Subscription, take} from 'rxjs';

import {Color, LegendPosition, NgxChartsModule, ScaleType} from '@swimlane/ngx-charts';
import {curveLinear, curveMonotoneX} from 'd3-shape';

import {UiEventsService} from '../services/ui-events.service';
import {ApiService} from '../services/api.service';
import {DateUtils} from '../services/date-utils';
import {MESSAGES, UI_TEXT} from '../services/message-service';

import {Entry} from '../models/entry-model';
import {DatasetForm} from './dataset-form';

type GraphType = 'actual' | 'target' | 'endDate';

interface NewEntry {
  value: number | null;
  label: string;
  date: string;
}

@Component({
  selector: 'app-dataset-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatasetForm, NgxChartsModule],
  templateUrl: './dataset-entries.html',
  styleUrls: ['./dataset-entries.css'],
})
export class DatasetEntries implements OnInit, OnDestroy {
  datasetId: number | null = null;

  // UI state
  activeTab = signal<'data' | 'graph' | 'edit'>('data');
  entriesLoading = signal<boolean>(false);
  graphLoading = signal<boolean>(false);

  // Entry state
  entries: Entry[] = [];
  newEntry: NewEntry = this.createEmptyEntry();

  // Dataset meta
  datasetSymbol = '';
  datasetName = '';

  // Graph state
  graphType = signal<GraphType>('actual');
  graphEntries: Entry[] = [];
  chartData: { name: string; series: { name: string; value: number }[] }[] = [];

  // Interactive chart options
  robustScale = signal<boolean>(true);
  smoothLine = signal<boolean>(true);
  showTimeline = signal<boolean>(true);
  roundDomains = signal<boolean>(true);

  // Computed y-axis bounds (robust to outliers)
  yScaleMin?: number;
  yScaleMax?: number;

  // Chart config
  colorScheme: Color = {
    name: 'datasetScheme',
    selectable: true,
    group: 'ordinal' as ScaleType,
    domain: ['#1976d2', '#9c27b0'],
  };

  // D3 curve reference for template
  get curve() { return this.smoothLine() ? curveMonotoneX : curveLinear; }

  private sub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    private readonly ui: UiEventsService
  ) {}

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.restoreTabFromHash();

    this.sub = this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      this.datasetId = idParam ? Number(idParam) : null;

      if (this.datasetId) {
        this.loadDatasetMeta(this.datasetId);
        this.loadEntries(this.datasetId);
        this.loadGraph('actual');
      } else {
        this.resetDatasetState();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ===== Entries CRUD =====
  loadEntries(datasetId: number): void {
    this.entriesLoading.set(true);
    this.api.get<Entry[]>(`/datasets/${datasetId}/entries`).subscribe({
      next: (rows) => {
        this.entries = (rows ?? [])
          .map((r) => ({ ...r, date: r.date ? DateUtils.toDateInputValue(r.date as any) : '' }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      error: (err) => this.handleError(err, MESSAGES.loadEntriesError),
      complete: () => this.entriesLoading.set(false),
    });
  }

  addEntry(): void {
    if (!this.datasetId) return;

    const { value, label, date } = this.newEntry;
    if (value == null || !label.trim() || !date.trim()) {
      this.ui.showAlert('info', MESSAGES.missingFields);
      return;
    }

    const payload = {
      value: Number(value),
      label: label.trim(),
      date: DateUtils.toISOString(date),
    };

    this.api.post<Entry>(`/datasets/${this.datasetId}/entries`, payload).subscribe({
      next: (res) => {
        this.ui.showAlert('success', MESSAGES.entryCreated);
        if (res?.id) {
          res.date = res.date ? DateUtils.toDateInputValue(res.date as any) : '';
          this.entries = [res, ...this.entries].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        } else {
          this.loadEntries(this.datasetId!);
        }
        this.newEntry = this.createEmptyEntry();
      },
      error: (err) => this.handleError(err, MESSAGES.entryCreateError),
    });
  }

  saveEntry(entry: Entry): void {
    if (!this.datasetId) return;

    const payload = {
      id: entry.id,
      datasetId: this.datasetId,
      value: Number(entry.value),
      label: entry.label?.trim() ?? '',
      date: DateUtils.toISOString(entry.date),
    };

    this.api.put(`/entries/${entry.id}`, payload).subscribe({
      next: () => this.ui.showAlert('success', MESSAGES.entryUpdated),
      error: (err) => this.handleError(err, MESSAGES.entryUpdateError),
    });
  }

  deleteEntry(entry: Entry): void {
    this.ui.showDialog({
      header: UI_TEXT.headers.confirmDelete,
      message: UI_TEXT.labels.confirmDeleteEntry,
      leftButtonText: UI_TEXT.buttons.cancel,
      rightButtonText: UI_TEXT.buttons.confirm,
    });

    this.ui.dialogResult$
      .pipe(take(1), filter((res) => res === 'right'))
      .subscribe(() => {
        this.api.delete(`/entries/${entry.id}`).subscribe({
          next: () => {
            this.ui.showAlert('success', MESSAGES.entryDeleted);
            this.entries = this.entries.filter((e) => e.id !== entry.id);
          },
          error: (err) => this.handleError(err, MESSAGES.entryDeleteError),
        });
      });
  }

  // ===== Graph logic =====
  setGraphType(type: GraphType): void {
    this.graphType.set(type);
    this.activeTab.set('graph');
    this.loadGraph(type);
  }

  loadGraph(type: GraphType = this.graphType()): void {
    if (!this.datasetId) return;

    this.graphLoading.set(true);

    const urlMap: Record<GraphType, string> = {
      actual: `/datasets/${this.datasetId}/entries`,
      target: `/datasets/${this.datasetId}/entries/projected/target`,
      endDate: `/datasets/${this.datasetId}/entries/projected/endDate`,
    };

    this.api.get<Entry[]>(urlMap[type]).subscribe({
      next: (rows) => {
        this.graphEntries = (rows ?? []).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        this.prepareChartData();
      },
      error: (err) => this.handleError(err, MESSAGES.graphLoadError),
      complete: () => this.graphLoading.set(false),
    });
  }

  private prepareChartData(): void {
    // Normalize and validate data to avoid NaN in chart coordinates
    const normalized = this.graphEntries
      .map((e) => {
        // Try to parse date robustly
        const d = new Date((e as any).date);
        const dateValid = !isNaN(d.getTime());
        const v = Number(e.value);
        const valueValid = Number.isFinite(v);
        return {
          projected: !!(e as any).projected,
          date: dateValid ? d : null,
          value: valueValid ? v : null,
        };
      })
      .filter((x) => x.date !== null && x.value !== null);

    const series = (projected: boolean) =>
      normalized
        .filter((x) => x.projected === projected)
        .map((x) => ({ name: x.date as Date, value: x.value as number }));

    this.chartData = [
      { name: MESSAGES.actual, series: series(false) },
      { name: MESSAGES.projected, series: series(true) },
    ];

    this.computeYBounds();
  }

  private computeYBounds(): void {
    const values = this.graphEntries.map((e) => Number(e.value)).filter((v) => !isNaN(v));
    if (!values.length) {
      this.yScaleMin = undefined;
      this.yScaleMax = undefined;
      return;
    }

    // Robust stats using IQR to mitigate outliers
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const within = sorted.filter((v) => v >= lowerFence && v <= upperFence);
    const minVal = within.length ? within[0] : sorted[0];
    const maxVal = within.length ? within[within.length - 1] : sorted[sorted.length - 1];

    // Add padding
    let range = maxVal - minVal;
    if (range === 0) range = Math.abs(maxVal) || 1;
    const pad = range * 0.1; // 10% padding
    this.yScaleMin = Math.floor((minVal - pad) * 1000) / 1000;
    this.yScaleMax = Math.ceil((maxVal + pad) * 1000) / 1000;

    function quantile(arr: number[], q: number): number {
      if (!arr.length) return 0;
      const pos = (arr.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      } else {
        return arr[base];
      }
    }
  }

  // ===== Dataset meta =====
  private loadDatasetMeta(id: number): void {
    this.api.get<any>(`/datasets/${id}`).subscribe({
      next: (d) => {
        this.datasetSymbol = d?.symbol ?? '';
        this.datasetName = d?.name ?? '';
      },
      error: (err) => this.handleError(err, MESSAGES.datasetMetaError),
    });
  }

  // ===== Helpers =====
  private handleError(err: any, message: string): void {
    console.error(err);
    this.ui.showAlert('error', message);
  }

  private createEmptyEntry(): NewEntry {
    return { value: null, label: '', date: '' };
  }

  private resetDatasetState(): void {
    this.entries = [];
    this.graphEntries = [];
    this.datasetSymbol = '';
    this.datasetName = '';
    this.chartData = [];
  }

  private restoreTabFromHash(): void {
    const hash = window.location.hash?.replace('#', '');
    if (hash === 'edit') this.activeTab.set('edit');
  }

  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input && typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
      } catch {}
    } else {
      input?.focus();
    }
  }

  // ===== New helpers & features =====
  resetNewEntry(): void {
    this.newEntry = this.createEmptyEntry();
  }

  // Filter & sort state
  filterQuery = '';
  filterFrom = '';
  filterTo = '';
  sortBy: 'date' | 'value' = 'date';
  sortDir: 'desc' | 'asc' = 'desc';

  private withinRange(dateStr: string): boolean {
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    if (this.filterFrom) {
      const from = new Date(this.filterFrom).getTime();
      if (t < from) return false;
    }
    if (this.filterTo) {
      const to = new Date(this.filterTo).getTime();
      if (t > to) return false;
    }
    return true;
  }

  viewEntries(): Entry[] {
    const q = this.filterQuery.trim().toLowerCase();
    const filtered = (this.entries || []).filter((e) => {
      const inText = !q || (e.label || '').toLowerCase().includes(q);
      const inDate = this.withinRange(e.date as any);
      return inText && inDate;
    });

    return [...filtered].sort((a, b) => {
      if (this.sortBy === 'date') {
        const da = new Date(a.date as any).getTime();
        const db = new Date(b.date as any).getTime();
        return this.sortDir === 'desc' ? db - da : da - db;
      } else {
        const va = Number(a.value) || 0;
        const vb = Number(b.value) || 0;
        return this.sortDir === 'desc' ? vb - va : va - vb;
      }
    });
  }

  get stats() {
    const arr = this.viewEntries();
    const count = arr.length;
    const avg = count ? arr.reduce((s, e) => s + (Number(e.value) || 0), 0) / count : 0;
    const latest = arr[0]?.value ?? null;
    return { count, avg, latest };
  }

  exportFilteredCsv(): void {
    const rows = this.viewEntries();
    const header = ['id', 'label', 'value', 'date'];
    const csv = [header.join(',')].concat(
      rows.map((r) => [r.id ?? '', escapeCsv(r.label ?? ''), String(r.value ?? ''), String(r.date ?? '')].join(','))
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ds = this.datasetName || 'dataset';
    a.download = `${ds}-entries.csv`;
    a.click();
    URL.revokeObjectURL(url);

    function escapeCsv(s: string): string {
      if (s == null) return '';
      const needsQuotes = /[",\n]/.test(s);
      const esc = s.replace(/"/g, '""');
      return needsQuotes ? `"${esc}"` : esc;
    }
  }

  // UI constants
  protected readonly LegendPosition = LegendPosition;
  protected readonly UI_TEXT = UI_TEXT;
}
