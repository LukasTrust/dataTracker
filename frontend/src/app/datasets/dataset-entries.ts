import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, filter, take } from 'rxjs';

import { NgxChartsModule, Color, LegendPosition, ScaleType } from '@swimlane/ngx-charts';

import { UiEventsService } from '../services/ui-events.service';
import { ApiService } from '../services/api.service';
import { DateUtils } from '../services/date-utils';
import { MESSAGES, UI_TEXT } from '../services/message-service';

import { Entry } from '../models/entry-model';
import { DatasetForm } from './dataset-form';

type GraphType = 'actual' | 'target' | 'endDate';

@Component({
  selector: 'app-dataset-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatasetForm, NgxChartsModule],
  templateUrl: './dataset-entries.html',
  styleUrl: './dataset-entries.css',
})
export class DatasetEntries implements OnInit, OnDestroy {
  datasetId: number | null = null;

  // UI state
  activeTab = signal<'data' | 'graph' | 'edit'>('data');
  entriesLoading = signal<boolean>(false);
  graphLoading = signal<boolean>(false);

  // Entry state
  entries: Entry[] = [];
  newEntry = this.createEmptyEntry();

  // Dataset meta
  datasetSymbol = '';
  datasetName = '';

  // Graph state
  graphType = signal<GraphType>('actual');
  graphEntries: Entry[] = [];
  chartData: { name: string; series: { name: string; value: number }[] }[] = [];

  // Chart config
  colorScheme: Color = {
    name: 'datasetScheme',
    selectable: true,
    group: 'ordinal' as ScaleType,
    domain: ['#1976d2', '#9c27b0'],
  };

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
    const series = (projected: boolean) =>
      this.graphEntries
        .filter((e) => e.projected === projected)
        .map((e) => ({
          name: new Date(e.date).toLocaleDateString(),
          value: Number(e.value),
        }));

    this.chartData = [
      { name: MESSAGES.actual, series: series(false) },
      { name: MESSAGES.projected, series: series(true) },
    ];
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

  private createEmptyEntry() {
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

  // UI constants
  protected readonly LegendPosition = LegendPosition;
  protected readonly UI_TEXT = UI_TEXT;
}
