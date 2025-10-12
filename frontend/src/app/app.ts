import {Component, HostListener, OnInit, signal} from '@angular/core';
import {Sidebar} from './sidebar/sidebar';
import {MainContent} from './main-content/main-content';
import {Alert} from './alert/alert';
import {AlertType, UiEventsService} from './services/ui-events.service';
import {MessageDialog} from './message-dialog/message-dialog';

@Component({
  selector: 'app-root',
  imports: [Sidebar, MainContent, Alert, MessageDialog],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit  {
  isSidebarCollapsed = signal<boolean>(false);
  screenWidth = signal<number>(window.innerWidth);

  showAlert = signal<boolean>(false);
  alertMessage = signal<string>('');
  alertType = signal<AlertType>('info');

  constructor(private readonly ui: UiEventsService) {}

  @HostListener('window:resize')
  onResize() {
    this.screenWidth.set(window.innerWidth);
    if (this.screenWidth() < 768) {
      this.isSidebarCollapsed.set(true);
    }
  }

  ngOnInit(): void {
    this.isSidebarCollapsed.set(this.screenWidth() < 768);
    // Subscribe to alerts from anywhere in the app
    this.ui.alert$.subscribe(({ type, message }) => {
      this.alertType.set(type);
      this.alertMessage.set(message);
      this.showAlert.set(true);
    });
  }

  changeIsSidebarCollapsed(isSidebarCollapsed: boolean): void {
    this.isSidebarCollapsed.set(isSidebarCollapsed);
  }

  onNotify(event: { type: AlertType; message: string }): void {
    // Keep backward compatibility for Sidebar notify
    this.alertType.set(event.type);
    this.alertMessage.set(event.message);
    this.showAlert.set(true);
  }

  onAlertClosed(): void {
    this.showAlert.set(false);
  }
}
