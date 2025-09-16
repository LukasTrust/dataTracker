import {Component, OnInit, signal, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import { UiEventsService } from '../services/ui-events.service';
import { Subscription } from 'rxjs';

interface DatasetDto {
  id?: number;
  name: string;
  description: string;
  symbol: string;
  targetValue?: number | null;
  startDate?: string | null; // use ISO date string (YYYY-MM-DD)
  endDate?: string | null;   // use ISO date string (YYYY-MM-DD)
}

@Component({
  selector: 'app-dataset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './dataset-form.html',
  styleUrl: './dataset-form.css'
})
export class DatasetForm implements OnInit, OnDestroy {
  form!: FormGroup;
  isEditMode = signal<boolean>(false);
  datasetId: number | null = null;
  loading = signal<boolean>(false);

  private sub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ui: UiEventsService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(2000)]],
      symbol: ['', [Validators.required, Validators.maxLength(50)]],
      targetValue: [null as number | null],
      startDate: [null as string | null], // yyyy-MM-dd
      endDate: [null as string | null],   // yyyy-MM-dd
    });

    this.sub = this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      if (idParam) {
        this.isEditMode.set(true);
        this.datasetId = Number(idParam);
        this.fetchDataset(this.datasetId);
      } else {
        this.isEditMode.set(false);
        this.datasetId = null;
        this.form.reset({ name: '', description: '', symbol: '', targetValue: null, startDate: null, endDate: null });
      }
    });
  }

  private fetchDataset(id: number): void {
    this.loading.set(true);
    this.http.get<DatasetDto>(`http://localhost:8080/datasets/${id}`).subscribe({
      next: (data) => {
        // Attempt to normalize dates to yyyy-MM-dd if present
        const start = data.startDate ? this.toDateInputValue(data.startDate) : null;
        const end = data.endDate ? this.toDateInputValue(data.endDate) : null;
        this.form.patchValue({
          name: data.name ?? '',
          description: data.description ?? '',
          symbol: data.symbol ?? '',
          targetValue: data.targetValue ?? null,
          startDate: start,
          endDate: end,
        });
      },
      error: (err) => {
        console.error('Failed to load dataset', err);
        this.ui.showAlert('error', 'Failed to load dataset.');
      },
      complete: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: DatasetDto = this.toDto();

    this.loading.set(true);
    if (this.isEditMode() && this.datasetId !== null) {
      this.http.put(`http://localhost:8080/datasets/${this.datasetId}`, dto).subscribe({
        next: () => {
          this.ui.showAlert('success', 'Dataset updated successfully.');
          this.ui.requestSidebarRefresh();
          // Navigate back to the tabbed view (DatasetEntries)
          this.router.navigateByUrl(`/datasets/${this.datasetId}`).catch(() => this.router.navigateByUrl('/'));
        },
        error: (err) => {
          console.error('Failed to update dataset', err);
          this.ui.showAlert('error', 'Failed to update dataset.');
        },
        complete: () => this.loading.set(false),
      });
    } else {
      this.http.post<{ id: number } | any>(`http://localhost:8080/datasets`, dto).subscribe({
        next: (res) => {
          this.ui.showAlert('success', 'Dataset created successfully.');
          const newId = (res && typeof res === 'object' && 'id' in res) ? Number((res as any).id) : null;
          this.ui.requestSidebarRefresh();
          if (newId) {
            this.router.navigateByUrl(`/datasets/${newId}`).catch(() => this.router.navigateByUrl('/'));
          } else {
            this.router.navigateByUrl('/');
          }
        },
        error: (err) => {
          console.error('Failed to create dataset', err);
          this.ui.showAlert('error', 'Failed to create dataset.');
        },
        complete: () => this.loading.set(false),
      });
    }
  }

  private toDto(): DatasetDto {
    const v = this.form.value as {
      name: string;
      description: string;
      symbol: string;
      targetValue: number | null;
      startDate: string | null;
      endDate: string | null;
    };

    // Ensure empty strings become null for optional fields
    return {
      name: v.name?.trim(),
      description: (v.description ?? '').trim(),
      symbol: (v.symbol ?? '').trim(),
      targetValue: v.targetValue === null || v.targetValue === undefined || v.targetValue === ('' as any) ? null : Number(v.targetValue),
      startDate: v.startDate && v.startDate !== '' ? v.startDate : null,
      endDate: v.endDate && v.endDate !== '' ? v.endDate : null,
    };
  }

  private toDateInputValue(value: string): string {
    // Accept ISO or date string and normalize to yyyy-MM-dd for date input
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
