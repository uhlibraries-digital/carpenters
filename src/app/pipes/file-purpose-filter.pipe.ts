import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filepurposefilter',
  pure: false
})
export class FilePurposeFilterPipe implements PipeTransform {
  transform(files: any[], purpose: string): any {
    if (!files || !purpose) {
      return files;
    }
    return files.filter(file => file.purpose === purpose);
  }
}
