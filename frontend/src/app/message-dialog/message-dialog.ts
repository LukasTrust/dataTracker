import {Component, HostListener, OnDestroy} from '@angular/core';
import { Subscription } from 'rxjs';
import { UiEventsService, DialogConfig } from '../services/ui-events.service';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-message-dialog',
  templateUrl: './message-dialog.html',
  imports: [
    NgIf
  ],
  styleUrls: ['./message-dialog.css']
})
export class MessageDialog implements OnDestroy {
  header = '';
  message = '';
  leftButtonText = '';
  rightButtonText = '';
  visible = false;

  private readonly sub?: Subscription;

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
    this.ui.emitDialogResult('left');
  }

  onRightClick() {
    this.ui.closeDialog();
    this.ui.emitDialogResult('right');
  }

  onOverlayClick() {
    this.ui.closeDialog();
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    if (this.visible) {
      this.ui.closeDialog();
    }
  }
}
