import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {Subscription, filter, take, forkJoin, catchError, of} from 'rxjs';

import { UiEventsService } from '../services/ui-events.service';
import { ApiService } from '../services/api.service';
import { DateUtils } from '../services/date-utils';
import { MESSAGES, UI_TEXT } from '../services/message-service';

import { Dataset } from '../models/dataset-model';

@Component({
  selector: 'app-dataset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './dataset-form.html',
  styleUrl: './dataset-form.css',
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
    private readonly ui: UiEventsService
  ) {}

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.initForm();

    this.sub = this.route.paramMap.subscribe((pm) => {
      const idParam = pm.get('id');
      if (idParam) {
        this.isEditMode.set(true);
        this.datasetId = Number(idParam);
        this.fetchDataset(this.datasetId);
      } else {
        this.resetForm();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ===== Init & Reset =====
  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(2000)]],
      symbol: ['', [Validators.required, Validators.maxLength(50)]],
      targetValue: [null as number | null],
      startDate: [null as string | null],
      endDate: [null as string | null],
    });
  }

  private resetForm(): void {
    this.isEditMode.set(false);
    this.datasetId = null;
    this.form.reset({
      name: '',
      description: '',
      symbol: '',
      targetValue: null,
      startDate: null,
      endDate: null,
    });
  }

  // ===== Fetch dataset =====
  private fetchDataset(id: number): void {
    this.loading.set(true);
    this.api.get<Dataset>(`/datasets/${id}`).subscribe({
      next: (data) => {
        this.form.patchValue({
          name: data.name ?? '',
          description: data.description ?? '',
          symbol: data.symbol ?? '',
          targetValue: data.targetValue ?? null,
          startDate: data.startDate ? DateUtils.toDateInputValue(data.startDate) : null,
          endDate: data.endDate ? DateUtils.toDateInputValue(data.endDate) : null,
        });
      },
      error: (err) => this.handleError(err, MESSAGES.loadDatasetError),
      complete: () => this.loading.set(false),
    });
  }

  // ===== Submit logic =====
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto: Dataset = this.toDataset();
    this.loading.set(true);

    if (this.isEditMode() && this.datasetId) {
      this.updateDataset(dto);
    } else {
      this.createDataset(dto);
    }
  }

  private updateDataset(dto: Dataset): void {
    this.api.put(`/datasets/${this.datasetId}`, dto).subscribe({
      next: () => {
        this.ui.showAlert('success', MESSAGES.datasetUpdated);
        this.ui.requestSidebarRefresh();
        this.router
          .navigateByUrl(`/datasets/${this.datasetId}`)
          .catch(() => this.router.navigateByUrl('/'));
      },
      error: (err) => this.handleError(err, MESSAGES.datasetUpdateError),
      complete: () => this.loading.set(false),
    });
  }

  private createDataset(dto: Dataset): void {
    this.api.post<{ id: number }>(`/datasets`, dto).subscribe({
      next: (res) => {
        this.ui.showAlert('success', MESSAGES.datasetCreated);
        this.ui.requestSidebarRefresh();

        const newId = res?.id ? Number(res.id) : null;
        if (newId) {
          this.router
            .navigateByUrl(`/datasets/${newId}`)
            .catch(() => this.router.navigateByUrl('/'));
        } else {
          this.router.navigateByUrl('/').then();
        }
      },
      error: (err) => this.handleError(err, MESSAGES.datasetCreateError),
      complete: () => this.loading.set(false),
    });
  }

  // ===== Delete logic =====
  onDelete(): void {
    if (!this.isEditMode() || !this.datasetId) return;

    this.ui.showDialog({
      header: UI_TEXT.headers.confirmDelete,
      message: UI_TEXT.labels.confirmDeleteDataset,
      leftButtonText: UI_TEXT.buttons.cancel,
      rightButtonText: UI_TEXT.buttons.confirm,
    });

    this.ui.dialogResult$
      .pipe(take(1), filter((res) => res === 'right'))
      .subscribe(() => {
        this.loading.set(true);
        this.api.delete(`/datasets/${this.datasetId}`).subscribe({
          next: () => {
            this.ui.showAlert('success', MESSAGES.datasetDeleted);
            this.ui.requestSidebarRefresh();
            this.router
              .navigateByUrl('/')
              .catch(() => this.router.navigateByUrl('/'));
          },
          error: (err) => this.handleError(err, MESSAGES.datasetDeleteError),
          complete: () => this.loading.set(false),
        });
      });
  }

  // ===== Copy logic =====
  createCopy(): void {
    if (!this.isEditMode() || !this.datasetId) return;

    const dto = { ...this.toDataset(), name: `${this.form.value.name} - 2` };
    this.loading.set(true);

    this.api.post<{ id: number }>(`/datasets`, dto).subscribe({
      next: (res) => {
        const newId = res?.id ? Number(res.id) : null;
        if (!newId) {
          this.ui.showAlert('error', MESSAGES.datasetCreateError);
          this.loading.set(false);
          return;
        }

        this.copyEntries(newId);
      },
      error: (err) => this.handleError(err, MESSAGES.datasetCreateError),
    });
  }

  private copyEntries(newId: number): void {
    this.api.get<any[]>(`/datasets/${this.datasetId}/entries`).subscribe({
      next: (entries) => {
        if (entries?.length) {
          const calls = entries.map((e) =>
            this.api.post(`/datasets/${newId}/entries`, {
              value: e.value,
              label: e.label,
              date: e.date ? DateUtils.toISOString(e.date) : null,
            }).pipe(
              catchError((err) => {
                console.error('Error copying entry:', err);
                return of(null); // keep forkJoin alive
              })
            )
          );

          forkJoin(calls).subscribe({
            next: () => this.finishCopy(newId, true),
            error: (err) => {
              console.error('Error during entries copy:', err);
              this.finishCopy(newId, false);
            },
          });
        } else {
          this.finishCopy(newId, true);
        }
      },
      error: (err) => {
        console.error('Error fetching entries for copy:', err);
        this.finishCopy(newId, false);
      },
    });
  }

  private finishCopy(newId: number, success: boolean): void {
    this.ui.showAlert(success ? 'success' : 'error', success ? MESSAGES.datasetCopied : MESSAGES.entryCopyError);
    this.ui.requestSidebarRefresh();
    this.router.navigateByUrl(`/datasets/${newId}`).catch(() => this.router.navigateByUrl('/'));
    this.loading.set(false);
  }

  // ===== Helpers =====
  private toDataset(): Dataset {
    const v = this.form.value as {
      name: string;
      description: string;
      symbol: string;
      targetValue: number | null;
      startDate: string | null;
      endDate: string | null;
    };

    return {
      name: v.name?.trim(),
      description: (v.description ?? '').trim(),
      symbol: (v.symbol ?? '').trim(),
      targetValue: v.targetValue != null && v.targetValue !== ('' as any) ? Number(v.targetValue) : null,
      startDate: v.startDate ? DateUtils.toISOString(v.startDate) : null,
      endDate: v.endDate ? DateUtils.toISOString(v.endDate) : null,
    };
  }

  private handleError(err: any, message: string): void {
    console.error(err);
    this.ui.showAlert('error', message);
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
  protected readonly UI_TEXT = UI_TEXT;
}
