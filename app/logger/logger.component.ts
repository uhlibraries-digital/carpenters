import { Component, ViewChild, AfterViewChecked, OnInit, ElementRef } from '@angular/core';
import { remote } from 'electron';
import { writeFile } from 'fs';

import { LoggerService } from '../shared/logger.service';

@Component({
  selector: 'logger',
  templateUrl: './logger/logger.component.html',
  styles: [ require('./logger.component.scss') ]
})
export class LoggerComponent implements OnInit, AfterViewChecked {

  entries: any;

  @ViewChild('loggerscroll')
  private scrollContainer: ElementRef;

  constructor(
    private logger: LoggerService){
    this.logger.log.subscribe(entries => this.entries = entries);
  }

  ngOnInit(): void {
    this.scrollToBottom();
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
    let { dialog } = remote;

    dialog.showSaveDialog({
      filters: [
        {name: 'text', extensions: ['txt']}
      ]
    }, (filename) => {
      if (filename === undefined) return;
      writeFile(filename, this.logger.toString());
    });
  }

}
