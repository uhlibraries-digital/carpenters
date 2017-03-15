import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable()
export class ActivityService {

  private activityBucket: string[] = [];

  @Output() active: EventEmitter<any> = new EventEmitter();

  start(): void {
    this.activityBucket.push('active');
    this.active.emit(true);
  }

  stop(): void {
    this.activityBucket.pop();
    if (this.activityBucket.length === 0) {
      this.active.emit(false);
    }
  }

}
