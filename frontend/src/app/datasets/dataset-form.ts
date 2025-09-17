import {Component, OnInit, signal, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {UiEventsService} from '../services/ui-events.service';
import {Subscription} from 'rxjs';
import {ApiService} from '../services/api.service';
import {DateUtils} from '../services/date-utils';
import { MESSAGES, UI_TEXT} from '../services/message-service';

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
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly ui: UiEventsService,
  ) {
  }

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
        this.form.reset({name: '', description: '', symbol: '', targetValue: null, startDate: null, endDate: null});
      }
    });
  }

  private fetchDataset(id: number): void {
    this.loading.set(true);
    this.api.get<DatasetDto>(`/datasets/${id}`).subscribe({
      next: (data) => {
        // Attempt to normalize dates to yyyy-MM-dd if present
        const start = data.startDate ? DateUtils.toDateInputValue(data.startDate) : null;
        const end = data.endDate ? DateUtils.toDateInputValue(data.endDate) : null;
        this.form.patchValue({
          name: data.name ?? '',
          description: data.description ?? '',
          symbol: data.symbol ?? '',
          targetValue: data.targetValue ?? null,
          startDate: start,
          endDate: end,
        });
      },
      error: () => {
        this.ui.showAlert('error', MESSAGES.loadDatasetError);
      },
      complete: () => this.loading.set(false),
    });
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: DatasetDto = this.toDto();

    this.loading.set(true);
    if (this.isEditMode() && this.datasetId !== null) {
      this.api.put(`/datasets/${this.datasetId}`, dto).subscribe({
        next: () => {
          this.ui.showAlert('success', MESSAGES.datasetUpdated);
          this.ui.requestSidebarRefresh();
          // Navigate back to the tabbed view (DatasetEntries)
          this.router.navigateByUrl(`/datasets/${this.datasetId}`).catch(() => this.router.navigateByUrl('/'));
        },
        error: () => {
          this.ui.showAlert('error', MESSAGES.datasetUpdateError);
        },
        complete: () => this.loading.set(false),
      });
    } else {
      this.api.post<{ id: number }>(`/datasets`, dto).subscribe({
        next: (res) => {
          this.ui.showAlert('success', MESSAGES.datasetCreated);
          const newId = (res && typeof res === 'object' && 'id' in res) ? Number((res).id) : null;
          this.ui.requestSidebarRefresh();
          if (newId) {
            this.router.navigateByUrl(`/datasets/${newId}`).catch(() => this.router.navigateByUrl('/'));
          } else {
            this.router.navigateByUrl('/').then();
          }
        },
        error: () => {
          this.ui.showAlert('error', MESSAGES.datasetCreateError);
        },
        complete: () => this.loading.set(false),
      });
    }
  }

  onDelete(): void {
    if (!this.isEditMode() || this.datasetId === null) {
      return;
    }

    this.loading.set(true);
    this.api.delete(`/datasets/${this.datasetId}`).subscribe({
      next: () => {
        this.ui.showAlert('success', MESSAGES.datasetDeleted);
        this.ui.requestSidebarRefresh();
        // Navigate back to the datasets list
        this.router.navigateByUrl(`/`).catch(() => this.router.navigateByUrl('/'));
      },
      error: () => {
        this.ui.showAlert('error', MESSAGES.datasetDeletedError);
      },
      complete: () => this.loading.set(false),
    });
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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  protected readonly UI_TEXT = UI_TEXT;
}

interface DatasetDto {
  id?: number;
  name: string;
  description: string;
  symbol: string;
  targetValue?: number | null;
  startDate?: string | null; // use ISO date string (YYYY-MM-DD)
  endDate?: string | null;   // use ISO date string (YYYY-MM-DD)
}
