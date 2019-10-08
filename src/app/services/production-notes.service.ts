import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable()
export class ProductionNotesService {

  @Output() displayNote: EventEmitter<any> = new EventEmitter();
  @Output() noteChanged: EventEmitter<any> = new EventEmitter();

  display(child: any) {
    this.displayNote.emit(child);
  }

  changed(child: any) {
    this.noteChanged.emit(child);
  }

}
