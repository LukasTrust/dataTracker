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

  // tabs: 'data' | 'edit'
  activeTab = signal<'data' | 'edit'>('data');

  entries: Entry[] = [];
  entriesLoading = signal<boolean>(false);
  newEntry: { value: number | null; label: string; date: string } = { value: null, label: '', date: '' };

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
      } else {
        this.entries = [];
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
}
