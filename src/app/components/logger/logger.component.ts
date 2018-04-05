import {
  Component, ViewChild, AfterViewChecked, AfterViewInit, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { ElementRef } from '@angular/core';
import { writeFile } from 'fs';

import { LoggerService } from 'app/services/logger.service';
import { ElectronService } from 'app/services/electron.service';

import { Entry } from 'app/classes/entry';

@Component({
  selector: 'logger',
  templateUrl: './logger.component.html',
  styleUrls: [ './logger.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoggerComponent implements OnInit, AfterViewChecked, AfterViewInit {

  entries: Entry[];

  @ViewChild('loggerscroll')
  private scrollContainer: ElementRef;

  constructor(
    private cdr: ChangeDetectorRef,
    private logger: LoggerService,
    private electronService: ElectronService){
  }

  ngOnInit(): void {
    this.entries = this.logger.entries;
    this.logger.log.subscribe((entries) => {
      this.entries = entries;
      this.detechChange();
    });
    this.scrollToBottom();
  }

  ngAfterViewInit() {
    this.cdr.detach();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try{
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(e) { }
  }

  saveLog(): void {
    this.electronService.dialog.showSaveDialog({
      filters: [
        {name: 'text', extensions: ['txt']}
      ]
    }, (filename) => {
      if (filename === undefined) return;
      writeFile(filename, this.logger.toString(), (err) => {
        if (err) {
          this.logger.error(err.message);
          throw err;
        }
      });
    });
  }

  trackByEntryUuid(index: number, entry: Entry) {
    return entry.uuid;
  }

  private detechChange(): void {
    if (!this.cdr['destroyed']) {
      this.cdr.detectChanges();
    }
  }

}
