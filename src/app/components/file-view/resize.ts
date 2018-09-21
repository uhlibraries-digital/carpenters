import { Component } from '@angular/core';

import { ObjectService } from 'app/services/object.service';

@Component({
  selector: 'resize',
  styles: [`
    :host {
      position: relative;
    }
    .resize {
      position: absolute;
      top: 0;
      bottom: 0;
      right: -5px;
      cursor: col-resize;
      z-index: 3;
      width: 8px;
      -webkit-user-select: none;
      display: flex;
      flex-direction: column;
    }
  `],
  template: `<div class="resize" draggable="true" (dblclick)="onReset()" (drag)="onDragHandle($event)"></div>`
})
export class ResizeComponent {

  constructor(private objectService: ObjectService) { }

  onDragHandle(event: MouseEvent) {
    if (!event.x || !event.y) return;
    this.objectService.setViewWidth(event.x);
  }

  onReset() {
    this.objectService.setViewWidthDefault();
  }

}