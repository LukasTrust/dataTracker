import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageDialog } from './message-dialog';

describe('MessageDialog', () => {
  let component: MessageDialog;
  let fixture: ComponentFixture<MessageDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
