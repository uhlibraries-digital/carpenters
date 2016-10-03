import { File } from './file';

export class DigitalObject {
  path: string;
  metadata: any;
  files: File[];

  hasFileType(type: string): boolean {
    let filter = this.files.filter(file => file.extensions[type.toUpperCase()] !== null);
    return filter.length > 0;
  }
}
