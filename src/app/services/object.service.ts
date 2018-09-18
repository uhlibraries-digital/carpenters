import { Injectable, EventEmitter }    from '@angular/core';

@Injectable()
export class ObjectService {

  public objectChanged: EventEmitter<any> = new EventEmitter();
  public objectsChanged: EventEmitter<any> = new EventEmitter();

  public setObjects(objs: any) {
    this.objectsChanged.emit(objs);
  }

  public setObject(obj: any) {
    this.objectChanged.emit(obj);
  }

  public clear() {
    this.objectChanged.emit(null);
  }

}