export class File {
  path: string;
  metadata: string[];
  filename: string;
  extensions: any;

  getFilenameWithPrefix(prefix: string): string {
    return this.filename + '_' + prefix + this.extensions[prefix.toUpperCase()];
  }

  getFilePartsWithPrefix(prefix: string): string {
    return 'objects/' + prefix + '/' +
      this.path.split('/').slice(1).join('/') + '/' +
      this.getFilenameWithPrefix(prefix);
  }

  hasFileExt(ext: string): boolean {
    return this.extensions[ext.toUpperCase()] !== null;
  }
}
