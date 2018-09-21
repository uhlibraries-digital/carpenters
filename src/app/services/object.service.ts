import { Injectable, EventEmitter }    from '@angular/core';

@Injectable()
export class ObjectService {

  public objectViewWidth: string = "300px"

  public objectChanged: EventEmitter<any> = new EventEmitter();
  public objectsChanged: EventEmitter<any> = new EventEmitter();
  public objectViewWidthChanged: EventEmitter<any> = new EventEmitter();

  public setObjects(objs: any) {
    this.objectsChanged.emit(objs);
  }

  public setObject(obj: any) {
    this.objectChanged.emit(obj);
  }

  public clear() {
    this.objectChanged.emit(null);
  }

  public setViewWidth(width: number) {
    width = Math.max(width, 100);
    this.objectViewWidth = width + 'px';
    this.objectViewWidthChanged.emit(this.objectViewWidth);
  }

  public setViewWidthDefault() {
    this.setViewWidth(300);
  }

}