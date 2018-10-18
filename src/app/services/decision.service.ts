import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class DecisionService {

  changed: EventEmitter<any> = new EventEmitter();
  answered: EventEmitter<any> = new EventEmitter();

  ask(question: string): void {
    this.changed.emit(question)
  }

  result(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.answered.subscribe((yes) => {
        return yes ? resolve() : reject();
      })
    })
  }

  answer(yes: boolean) {
    this.answered.emit(yes);
    this.changed.emit('');
  }
}