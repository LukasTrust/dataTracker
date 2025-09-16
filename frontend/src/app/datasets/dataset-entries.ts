import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UiEventsService } from '../services/ui-events.service';
import { Entry } from '../models/entry-model';
import { DatasetForm } from './dataset-form';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dataset-entries',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DatasetForm],
  templateUrl: './dataset-entries.html',
  styleUrl: './dataset-entries.css',
})
export class DatasetEntries implements OnInit, OnDestroy {
  datasetId: number | null = null;

  // tabs row includes data, three graph variants, edit
  activeTab = signal<'data' | 'graph' | 'edit'>('data');

  entries: Entry[] = [];
  entriesLoading = signal<boolean>(false);
  newEntry: { value: number | null; label: string; date: string } = { value: null, label: '', date: '' };

  // Dataset meta
  datasetSymbol: string = '';

  // Graph state
  graphType = signal<'actual' | 'target' | 'endDate'>('actual');
  graphLoading = signal<boolean>(false);
  graphEntries: Entry[] = [];
  graphViewBox = { width: 760, height: 360, padding: 48 };
  graphRealPolyline = '';
  graphProjectedPolyline = '';
  graphPoints: { x: number; y: number; label: string; dateStr: string; value: number; projected?: boolean }[] = [];
  xTicks: { x: number; label: string }[] = [];
  yTicks: { y: number; label: string }[] = [];

  tooltip = { visible: false, x: 0, y: 0, text: '' };

  private sub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly ui: UiEventsService,
  ) {}


  ngOnInit(): void {
    // If URL contains a fragment like #edit, open the edit tab
    const hash = window.location.hash?.replace('#', '');
    if (hash === 'edit') this.activeTab.set('edit');

    this.sub = this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      this.datasetId = idParam ? Number(idParam) : null;
      if (this.datasetId) {
        this.loadEntries(this.datasetId);
        this.loadDatasetMeta(this.datasetId);
        // default graph load
        this.loadGraph('actual');
      } else {
        this.entries = [];
        this.graphEntries = [];
        this.datasetSymbol = '';
        this.updateGraphGeometry();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ===== Entries CRUD =====
  loadEntries(datasetId: number): void {
    this.entriesLoading.set(true);
    this.http.get<Entry[]>(`http://localhost:8080/datasets/${datasetId}/entries`).subscribe({
      next: (rows) => {
        this.entries = (rows || []).map((r) => ({ ...r, date: r.date ? this.toDateInputValue(r.date as any) : '' }));
      },
      error: (err) => {
        console.error('Failed to load entries', err);
        this.ui.showAlert('error', 'Failed to load entries.');
      },
      complete: () => this.entriesLoading.set(false),
    });
  }

  addEntry(): void {
    if (this.datasetId === null) return;
    const value = this.newEntry.value;
    const label = (this.newEntry.label || '').trim();
    const date = (this.newEntry.date || '').trim();
    if (value === null || value === undefined || label === '' || date === '') {
      this.ui.showAlert('info', 'Please fill value, label, and date.');
      return;
    }

    const payload = {
      value: Number(value),
      label,
      date: this.toISOString(date)  // <-- convert here
    } as any;

    this.http
      .post<Entry | any>(`http://localhost:8080/datasets/${this.datasetId}/entries`, payload)
      .subscribe({
        next: (res) => {
          this.ui.showAlert('success', 'Entry created.');
          if (res && typeof res === 'object' && 'id' in res) {
            const created = res as Entry;
            created.date = created.date ? this.toDateInputValue(created.date as any) : '';
            this.entries = [created, ...this.entries];
          } else {
            this.loadEntries(this.datasetId!);
          }
          this.resetNewEntry();
        },
        error: (err) => {
          console.error('Failed to create entry', err);
          this.ui.showAlert('error', 'Failed to create entry.');
        },
      });
  }

  saveEntry(entry: Entry): void {
    const id = entry.id;
    const payload = {
      id: entry.id,
      datasetId: this.datasetId,
      value: Number(entry.value),
      label: (entry.label || '').trim(),
      date: this.toISOString(entry.date), // <-- fix here
    };
    this.http.put(`http://localhost:8080/entries/${id}`, payload).subscribe({
      next: () => this.ui.showAlert('success', 'Entry updated.'),
      error: (err) => {
        console.error('Failed to update entry', err);
        this.ui.showAlert('error', 'Failed to update entry.');
      },
    });
  }

  private toISOString(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString(); // e.g. "2025-01-01T00:00:00.000Z"
  }

  deleteEntry(entry: Entry): void {
    const id = entry.id;
    this.http.delete(`http://localhost:8080/entries/${id}`).subscribe({
      next: () => {
        this.ui.showAlert('success', 'Entry deleted.');
        this.entries = this.entries.filter((e) => e.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete entry', err);
        this.ui.showAlert('error', 'Failed to delete entry.');
      },
    });
  }

  toDateInputValue(value: string): string {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return value;
    }
  }

  private resetNewEntry(): void {
    this.newEntry = { value: null, label: '', date: '' };
  }

  // ===== Graph logic =====
  setGraphType(type: 'actual' | 'target' | 'endDate'): void {
    this.graphType.set(type);
    this.activeTab.set('graph');
    this.loadGraph(type);
  }

  loadGraph(type: 'actual' | 'target' | 'endDate' = this.graphType()): void {
    if (this.datasetId === null) return;
    this.graphLoading.set(true);
    const base = `http://localhost:8080/datasets/${this.datasetId}/entries`;
    const url = type === 'actual' ? base : type === 'target' ? `${base}/projected/target` : `${base}/projected/endDate`;
    this.http.get<Entry[]>(url).subscribe({
      next: (rows) => {
        this.graphEntries = (rows || []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        this.updateGraphGeometry();
      },
      error: (err) => {
        console.error('Failed to load graph data', err);
        this.ui.showAlert('error', 'Failed to load graph data.');
      },
      complete: () => this.graphLoading.set(false),
    });
  }

  private loadDatasetMeta(id: number): void {
    this.http.get<any>(`http://localhost:8080/datasets/${id}`).subscribe({
      next: (d) => {
        this.datasetSymbol = (d && typeof d === 'object' && 'symbol' in d) ? String((d as any).symbol ?? '') : '';
      },
      error: (err) => {
        console.error('Failed to load dataset meta', err);
        this.ui.showAlert('error', 'Failed to load dataset details.');
      },
    });
  }

  private updateGraphGeometry(): void {
    const w = this.graphViewBox.width;
    const h = this.graphViewBox.height;
    const p = this.graphViewBox.padding;
    const innerW = w - p * 2;
    const innerH = h - p * 2;

    const items = this.graphEntries.map((e) => ({
      ...e,
      t: new Date(e.date).getTime(),
      v: Number(e.value),
    })).filter((e) => !isNaN(e.t) && !isNaN(e.v));

    if (items.length === 0) {
      this.graphRealPolyline = '';
      this.graphProjectedPolyline = '';
      this.graphPoints = [];
      return;
    }

    const minT = Math.min(...items.map((i) => i.t));
    const maxT = Math.max(...items.map((i) => i.t));
    let minV = Math.min(...items.map((i) => i.v));
    let maxV = Math.max(...items.map((i) => i.v));

    if (minV === maxV) { // avoid flat line scaling
      minV -= 1;
      maxV += 1;
    }
    const tRange = maxT - minT || 1;
    const vRange = maxV - minV || 1;

    const scaleX = (t: number) => p + ((t - minT) / tRange) * innerW;
    const scaleY = (v: number) => p + innerH - ((v - minV) / vRange) * innerH;

    const sorted = items.sort((a, b) => a.t - b.t);

    const realPts: string[] = [];
    const projPts: string[] = [];
    const pts: { x: number; y: number; label: string; dateStr: string; value: number; projected?: boolean }[] = [];

    for (const it of sorted) {
      const x = scaleX(it.t);
      const y = scaleY(it.v);
      pts.push({ x, y, label: it.label, dateStr: new Date(it.t).toLocaleDateString(), value: it.v, projected: it.projected });
      if (it.projected) {
        projPts.push(`${x},${y}`);
      } else {
        realPts.push(`${x},${y}`);
      }
    }

    // compute ticks
    const xTickCount = Math.min(6, Math.max(2, Math.round(innerW / 120)));
    const yTickCount = 5;
    const xTicks: { x: number; label: string }[] = [];
    for (let i = 0; i <= xTickCount; i++) {
      const t = minT + (tRange * i) / xTickCount;
      const x = scaleX(t);
      const label = new Date(t).toLocaleDateString();
      xTicks.push({ x, label });
    }
    const yTicks: { y: number; label: string }[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      const v = minV + (vRange * i) / yTickCount;
      const y = scaleY(v);
      const label = `${v.toFixed(2)}`;
      yTicks.push({ y, label });
    }

    this.graphRealPolyline = realPts.join(' ');
    this.graphProjectedPolyline = projPts.join(' ');
    this.graphPoints = pts;
    this.xTicks = xTicks;
    this.yTicks = yTicks;
  }

  // Tooltip handlers for SVG points
  showTip(evt: MouseEvent, p: { x: number; y: number; label: string; dateStr: string; value: number; projected?: boolean }): void {
    const margin = 12;
    this.tooltip.visible = true;
    this.tooltip.text = `${p.dateStr} — ${p.label}: ${p.value}${this.datasetSymbol ? ' ' + this.datasetSymbol : ''}${p.projected ? ' (projected)' : ''}`;
    this.tooltip.x = (evt.clientX || 0) + margin;
    this.tooltip.y = (evt.clientY || 0) + margin;
  }
  moveTip(evt: MouseEvent): void {
    if (!this.tooltip.visible) return;
    const margin = 12;
    this.tooltip.x = (evt.clientX || 0) + margin;
    this.tooltip.y = (evt.clientY || 0) + margin;
  }
  hideTip(): void {
    this.tooltip.visible = false;
  }
}
