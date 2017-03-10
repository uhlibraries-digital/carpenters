import { File } from './file';

export class Item {
  title: string;
  level: string;
  selected: boolean = true;
  containers: any[];
  files: File[] = [];

  constructor(index?: number) {
    if (index !== undefined) {
      this.assignTitleAndContainer(index);
    }
    this.level = 'item';
    this.selected = true;
    this.files = [];
  }

  assignTitleAndContainer(index: number): void {
    this.title = 'Item ' + this.padLeft((index + 1), 3, '0');
    this.containers = [{
      type_1: 'Item',
      indicator_1: index + 1
    }];
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }

}
