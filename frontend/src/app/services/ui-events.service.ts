import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type AlertType = 'info' | 'error' | 'success';

@Injectable({ providedIn: 'root' })
export class UiEventsService {
  private alertSubject = new Subject<{ type: AlertType; message: string }>();
  alert$ = this.alertSubject.asObservable();

  private sidebarRefreshSubject = new Subject<void>();
  sidebarRefresh$ = this.sidebarRefreshSubject.asObservable();

  showAlert(type: AlertType, message: string): void {
    this.alertSubject.next({ type, message });
  }

  requestSidebarRefresh(): void {
    this.sidebarRefreshSubject.next();
  }
}
