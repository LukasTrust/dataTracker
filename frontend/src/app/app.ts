import {Component, HostListener, OnInit, signal} from '@angular/core';
import {Sidebar} from './sidebar/sidebar';
import {MainContent} from './main-content/main-content';

@Component({
  selector: 'app-root',
  imports: [Sidebar, MainContent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit  {
  isSidebarCollapsed = signal<boolean>(false);
  screenWidth = signal<number>(window.innerWidth);

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
}
