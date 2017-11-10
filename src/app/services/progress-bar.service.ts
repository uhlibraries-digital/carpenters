import { Injectable, Output, EventEmitter } from '@angular/core';

import { ProgressBar } from '../classes/progress-bar';

@Injectable()
export class ProgressBarService {

  progressbars: ProgressBar[] = [];

  @Output() changed:EventEmitter<any> = new EventEmitter();

  newProgressBar(max: number, description?: string): string {
    let pb = new ProgressBar(max, description);

    this.progressbars.push(pb);
    this.changed.emit(this.progressbars);

    return pb.id;
  }

  setProgressBarMax(id: string, max: number): void {
    let bar = this.findBar(id);
    if (bar) {
      bar.max = max;
    }
  }

  setProgressBar(id: string, value: number): void {
    let bar = this.findBar(id);
    if (bar) {
      bar.value = value;
      this.changed.emit(this.progressbars);
    }
  }

  setDescription(id: string, description: string) {
    let bar = this.findBar(id);
    if (bar) {
      bar.description = description;
      this.changed.emit(this.progressbars);
    }
  }

  clearProgressBar(id: string): void {
    let index = this.progressbars.findIndex((pb) => {
      return pb.id === id;
    });
    if (index === -1) { return; }
    this.progressbars.splice(index, 1);
  }

  clear(): void {
    this.progressbars = [];
    this.changed.emit(this.progressbars);
  }

  private findBar(id: string): ProgressBar {
    return this.progressbars.find((pb) => {
      return pb.id === id;
    });
  }

}
