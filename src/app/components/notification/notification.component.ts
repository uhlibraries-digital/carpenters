import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { LoggerService } from 'app/services/logger.service';
import { ProgressBarService } from 'app/services/progress-bar.service';
import { DecisionService } from 'app/services/decision.service';

import { Entry } from 'app/classes/entry';
import { ProgressBar } from 'app/classes/progress-bar';

@Component({
  selector: 'notification',
  templateUrl: './notification.component.html',
  styleUrls: [ './notification.component.scss' ]
})
export class NotificationComponent implements OnInit {

  entries: Entry[];
  progressbars: ProgressBar[];
  question: string;

  @ViewChild('notifications') element: ElementRef;

  constructor(
    private log: LoggerService,
    private progress: ProgressBarService,
    private decision: DecisionService) {
  }

  ngOnInit(): void {
    this.entries = [];
    this.log.changed.subscribe((entry) => {
      if (entry.notify) {
        this.entries.push(entry);
      }
    });
    this.progress.changed.subscribe((bars) => {
      this.progressbars = bars;
    });
    this.decision.changed.subscribe((question) => {
      this.question = question;
    })
  }

  notifyClass(n: any): string {
    let nClass = ['notification', n.type];
    return nClass.join(' ');
  }

  close(i: number): void {
    this.entries.splice(i, 1);
  }

  closeAll(): void {
    this.entries = [];
  }

  notificationStyles(): any {
    if (this.element.nativeElement.scrollHeight > this.element.nativeElement.offsetHeight
      && this.entries.length > 0) {
      return { 'pointer-events': 'auto'};
    }
    return { 'pointer-events': 'none'};
  }

  answer(yes: boolean): void {
    this.decision.answer(yes);
  }


}
