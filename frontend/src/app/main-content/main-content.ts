import {Component, computed, input} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-main-content',
  imports: [
    RouterOutlet,
    NgClass
  ],
  templateUrl: './main-content.html',
  styleUrl: './main-content.css'
})
export class MainContent {
  isSidebarCollapsed = input.required<boolean>();
  screenWidth = input.required<number>();
  sizeClass = computed(() => {
    const isSidebarCollapsed = this.isSidebarCollapsed();
    if (isSidebarCollapsed) {
      return '';
    }
    return this.screenWidth() > 768 ? 'body-trimmed' : 'body-md-screen';
  });
}
