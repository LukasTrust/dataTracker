import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UiEventsService, DialogConfig } from '../services/ui-events.service';

@Component({
  selector: 'app-message-dialog',
  templateUrl: './message-dialog.html',
  styleUrls: ['./message-dialog.css']
})
export class MessageDialog implements OnDestroy {
  header = '';
  message = '';
  leftButtonText = '';
  rightButtonText = '';
  visible = false;

  private sub?: Subscription;

  constructor(private readonly ui: UiEventsService) {
    this.sub = this.ui.dialog$.subscribe((config: DialogConfig | null) => {
      if (config) {
        this.header = config.header;
        this.message = config.message;
        this.leftButtonText = config.leftButtonText ?? 'Cancel';
        this.rightButtonText = config.rightButtonText ?? 'OK';
        this.visible = true;
      } else {
        this.visible = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onLeftClick() {
    this.ui.closeDialog();
    this.ui['dialogResultSubject'].next('left'); // emit back to service
  }

  onRightClick() {
    this.ui.closeDialog();
    this.ui['dialogResultSubject'].next('right');
  }
}
