import { Component, Input, ViewChild, AfterViewChecked } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'prompt',
  templateUrl: './prompt.component.html',
  styleUrls: [ './prompt.component.scss' ]
})
export class PromptComponent implements AfterViewChecked {

  @ViewChild('fieldInput') fieldInput;
  @Input() message;
  value: string;

  constructor(public activeModal: NgbActiveModal) { }

  ngAfterViewChecked(): void {
    this.fieldInput.nativeElement.focus();
  }

  keydownCheck(event): void {
    if (event.keyCode === 13) {
      this.activeModal.close(this.value);
    }
  }


}
