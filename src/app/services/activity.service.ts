import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable()
export class ActivityService {

  private activityBucket: any = {};

  @Output() active: EventEmitter<any> = new EventEmitter();
  @Output() finishedKey: EventEmitter<any> = new EventEmitter();

  start(key: string = 'app'): void {
    if (this.activityBucket[key] === undefined) {
      this.activityBucket[key] = [];
    }
    this.activityBucket[key].push('active');
    this.active.emit(true);
  }

  stop(key: string = 'app'): void {
    if (this.activityBucket[key] === undefined ) { return; }
    this.activityBucket[key].pop();
    if (this.activityBucket[key].length === 0) {
      this.finishedKey.emit(key);
    }
    if (this.finishedAll()) {
      this.active.emit(false);
    }
  }

  finishedAll(): boolean {
    for(let key in this.activityBucket) {
      if (this.activityBucket[key].length > 0) {
        return false;
      }
    }
    return true;
  }

  finished(key: string): boolean {
    if (this.activityBucket[key] && this.activityBucket[key].length > 0) {
      return false;
    }
    return true;
  }

}
