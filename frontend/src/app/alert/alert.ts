import { Component, Input, OnChanges, SimpleChanges, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.html',
  styleUrl: './alert.css'
})
export class Alert implements OnChanges {
  @Input() show: boolean = false;
  @Input() alertType: 'info' | 'error' | 'success' = 'info';
  @Input() alertMessage: string = '';

  // Emits when the alert auto-hides or is manually closed
  closed = output<void>();

  private hideTimer: any;

  ngOnChanges(changes: SimpleChanges): void {
    // Reset the timer whenever we show a new alert
    if (changes['show'] || changes['alertMessage'] || changes['alertType']) {
      this.setupAutoHide();
    }
  }

  private setupAutoHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.show) {
      this.hideTimer = setTimeout(() => {
        this.closed.emit();
      }, 10000); // 10 seconds
    }
  }

  onCloseClick(): void {
    this.closed.emit();
  }
}
