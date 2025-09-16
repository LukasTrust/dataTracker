import {Component, HostListener, OnInit, signal} from '@angular/core';
import {Sidebar} from './sidebar/sidebar';
import {MainContent} from './main-content/main-content';
import {Alert} from './alert/alert';

@Component({
  selector: 'app-root',
  imports: [Sidebar, MainContent, Alert],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit  {
  isSidebarCollapsed = signal<boolean>(false);
  screenWidth = signal<number>(window.innerWidth);

  showAlert = signal<boolean>(false);
  alertMessage = signal<string>('');
  alertType = signal<'info' | 'error' | 'success'>('info');

  @HostListener('window:resize')
  onResize() {
    this.screenWidth.set(window.innerWidth);
    if (this.screenWidth() < 768) {
      this.isSidebarCollapsed.set(true);
    }
  }

  ngOnInit(): void {
    this.isSidebarCollapsed.set(this.screenWidth() < 768);
  }

  changeIsSidebarCollapsed(isSidebarCollapsed: boolean): void {
    this.isSidebarCollapsed.set(isSidebarCollapsed);
  }

  onNotify(event: { type: 'info' | 'error' | 'success'; message: string }): void {
    this.alertType.set(event.type);
    this.alertMessage.set(event.message);
    this.showAlert.set(true);
  }

  onAlertClosed(): void {
    this.showAlert.set(false);
  }
}
