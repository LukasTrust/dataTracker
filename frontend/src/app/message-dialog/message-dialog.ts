import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-message-dialog',
  templateUrl: './message-dialog.html',
  styleUrls: ['./message-dialog.css']
})
export class MessageDialog {
  @Input() header: string = 'Message';
  @Input() message: string = 'This is a dialog message.';
  @Input() leftButtonText: string = 'Cancel';
  @Input() rightButtonText: string = 'OK';

  @Output() leftButtonClick = new EventEmitter<void>();
  @Output() rightButtonClick = new EventEmitter<void>();

  onLeftClick() {
    this.leftButtonClick.emit();
  }

  onRightClick() {
    this.rightButtonClick.emit();
  }
}
