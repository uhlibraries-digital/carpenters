import { Component, OnInit } from '@angular/core';

import { LoggerService } from 'app/services/logger.service';

import { Entry } from 'app/classes/entry';

@Component({
  selector: 'notification',
  templateUrl: './notification.component.html',
  styleUrls: [ './notification.component.scss' ]
})
export class NotificationComponent implements OnInit {

  entries: Entry[];

  constructor(
    private log: LoggerService) {
  }

  ngOnInit(): void {
    this.entries = [];
    this.log.changed.subscribe((entry) => {
      if (entry.notify) {
        this.entries.push(entry);
      }
    });
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


}
