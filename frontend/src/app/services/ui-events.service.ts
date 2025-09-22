import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AlertType = 'info' | 'error' | 'warning' | 'success';

export interface DialogConfig {
  header: string;
  message: string;
  leftButtonText?: string;
  rightButtonText?: string;
}

@Injectable({ providedIn: 'root' })
export class UiEventsService {
  // --- Alert events ---
  private readonly alertSubject = new Subject<{ type: AlertType; message: string }>();
  alert$ = this.alertSubject.asObservable();

  // --- Sidebar refresh events ---
  private readonly sidebarRefreshSubject = new Subject<void>();
  sidebarRefresh$ = this.sidebarRefreshSubject.asObservable();

  // --- Dialog events ---
  private readonly dialogSubject = new Subject<DialogConfig | null>();
  dialog$ = this.dialogSubject.asObservable();

  private readonly dialogResultSubject = new Subject<'left' | 'right'>();
  dialogResult$ = this.dialogResultSubject.asObservable();

  // --- Alert API ---
  showAlert(type: AlertType, message: string): void {
    this.alertSubject.next({ type, message });
  }

  // --- Sidebar API ---
  requestSidebarRefresh(): void {
    this.sidebarRefreshSubject.next();
  }

  // --- Dialog API ---
  showDialog(config: DialogConfig): void {
    this.dialogSubject.next(config);
  }

  closeDialog(): void {
    this.dialogSubject.next(null);
  }

  emitDialogResult(result: 'left' | 'right') {
    this.dialogResultSubject.next(result);
  }
}
