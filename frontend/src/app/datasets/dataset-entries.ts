import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {UiEventsService} from '../services/ui-events.service';
import {Entry} from '../models/entry-model';
import {DatasetForm} from './dataset-form';
import {Subscription} from 'rxjs';
import {ApiService} from '../services/api.service';
import {DateUtils} from '../services/date-utils';
import {Color, LegendPosition, NgxChartsModule, ScaleType} from '@swimlane/ngx-charts';
import {MESSAGES, UI_TEXT} from '../services/message-service';

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

  // tabs row includes data, three graph variants, edit
  activeTab = signal<'data' | 'graph' | 'edit'>('data');

  entries: Entry[] = [];
  entriesLoading = signal<boolean>(false);
  newEntry: { value: number | null; label: string; date: string } = {value: null, label: '', date: ''};

  // Dataset meta
  datasetSymbol: string = '';
  datasetName: string = '';

  // Graph state
  graphType = signal<GraphType>('actual');
  graphLoading = signal<boolean>(false);
  graphEntries: Entry[] = [];

  // ngx-charts data
  chartData: { name: string; series: { name: string; value: number }[] }[] = [];
  colorScheme: Color = {
    name: 'datasetScheme',
    selectable: true,
    group: 'ordinal' as ScaleType,
    domain: ['#1976d2', '#9c27b0']
  };

  private sub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService,
    private readonly ui: UiEventsService,
  ) {
  }

  ngOnInit(): void {
    const hash = window.location.hash?.replace('#', '');
    if (hash === 'edit') this.activeTab.set('edit');

    this.sub = this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      this.datasetId = idParam ? Number(idParam) : null;
      if (this.datasetId) {
        this.loadEntries(this.datasetId);
        this.loadDatasetMeta(this.datasetId);
        this.loadGraph('actual');
      } else {
        this.entries = [];
        this.graphEntries = [];
        this.datasetSymbol = '';
        this.datasetName = '';
        this.chartData = [];
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
        this.entries = (rows || [])
          .map((r) => ({
            ...r,
            date: r.date ? DateUtils.toDateInputValue(r.date as any) : ''
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      },
      error: (err) => {
        console.error('Error loading entries:', err);
        this.ui.showAlert('error', MESSAGES.loadEntriesError);
      },
      complete: () => this.entriesLoading.set(false),
    });
  }

  addEntry(): void {
    if (!this.datasetId) return;
    const value = this.newEntry.value;
    const label = (this.newEntry.label || '').trim();
    const date = (this.newEntry.date || '').trim();
    if (value == null || label === '' || date === '') {
      this.ui.showAlert('info', MESSAGES.missingFields);
      return;
    }

    const payload = {value: Number(value), label, date: DateUtils.toISOString(date)};

    this.api.post<Entry>(`/datasets/${this.datasetId}/entries`, payload).subscribe({
      next: (res) => {
        this.ui.showAlert('success', MESSAGES.entryCreated);
        if (res?.id) {
          res.date = res.date ? DateUtils.toDateInputValue(res.date as any) : '';
          this.entries = [res, ...this.entries];
        } else {
          this.loadEntries(this.datasetId!);
        }
        this.resetNewEntry();
      },
      error: (err) => {
        console.error('Error adding entry:', err);
        this.ui.showAlert('error', MESSAGES.entryCreateError)
      },
    });
  }

  saveEntry(entry: Entry): void {
    if (!this.datasetId) return;
    const payload = {
      id: entry.id,
      datasetId: this.datasetId,
      value: Number(entry.value),
      label: (entry.label || '').trim(),
      date: DateUtils.toISOString(entry.date),
    };
    this.api.put(`/entries/${entry.id}`, payload).subscribe({
      next: () => this.ui.showAlert('success', MESSAGES.entryUpdated),
      error: (err) => {
        console.error('Error updating entry:', err);
        this.ui.showAlert('error', MESSAGES.entryUpdateError)
      },
    });
  }

  deleteEntry(entry: Entry): void {
    this.ui.showDialog({
      header: this.UI_TEXT.headers.confirmDelete,
      message: this.UI_TEXT.labels.confirmDeleteEntry,
      leftButtonText: this.UI_TEXT.buttons.cancel,
      rightButtonText: this.UI_TEXT.buttons.confirm
    });

    const sub = this.ui.dialogResult$.subscribe((result) => {
      if (result === 'right') {
        this.api.delete(`/entries/${entry.id}`).subscribe({
          next: () => {
            this.ui.showAlert('success', MESSAGES.entryDeleted);
            this.entries = this.entries.filter((e) => e.id !== entry.id);
          },
          error: (err) => {
            console.error('Error deleting entry:', err);
            this.ui.showAlert('error', MESSAGES.entryDeleteError);
          },
        });
      }
      sub.unsubscribe(); // cleanup after one response
    });
  }


  protected resetNewEntry(): void {
    this.newEntry = {value: null, label: '', date: ''};
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

    const urlMap = {
      actual: `/datasets/${this.datasetId}/entries`,
      target: `/datasets/${this.datasetId}/entries/projected/target`,
      endDate: `/datasets/${this.datasetId}/entries/projected/endDate`,
    };

    this.api.get<Entry[]>(urlMap[type]).subscribe({
      next: (rows) => {
        this.graphEntries = (rows || [])
          .slice()
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.prepareChartData();
      },
      error: (err) => {
        console.error('Error loading graph:', err);
        this.ui.showAlert('error', MESSAGES.graphLoadError)
      },
      complete: () => this.graphLoading.set(false),
    });
  }

  private loadDatasetMeta(id: number): void {
    this.api.get<any>(`/datasets/${id}`).subscribe({
      next: (d) => {
        this.datasetSymbol = d?.symbol ?? '';
        this.datasetName = d?.name ?? '';
      },
      error: (err) => {
        console.error('Error loading dataset meta:', err);
        this.ui.showAlert('error', MESSAGES.datasetMetaError)},
    });
  }

  private prepareChartData(): void {
    const actualSeries = this.graphEntries
      .filter((e) => !e.projected)
      .map((e) => ({name: new Date(e.date).toLocaleDateString(), value: Number(e.value)}));

    const projectedSeries = this.graphEntries
      .filter((e) => e.projected)
      .map((e) => ({name: new Date(e.date).toLocaleDateString(), value: Number(e.value)}));

    this.chartData = [
      {name: MESSAGES.actual, series: actualSeries},
      {name: MESSAGES.projected, series: projectedSeries},
    ];
  }

  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input && typeof (input as any).showPicker === 'function') {
      try {
        (input as any).showPicker();
      } catch {
      }
    } else {
      input?.focus();
    }
  }

  protected readonly LegendPosition = LegendPosition;
  protected readonly UI_TEXT = UI_TEXT;
}
