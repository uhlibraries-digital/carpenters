import { Directive, ElementRef, OnInit, HostListener , Input} from '@angular/core';

@Directive({
  selector: '[file-draggable]'
})
export class FileDraggable implements OnInit {

  @Input('file-draggable') file: any;

  constructor(
    private el: ElementRef) {
  }

  @HostListener('dragstart', ['$event']) onDragStart(e: DragEvent) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text', JSON.stringify(this.file));
  }

  @HostListener('dragend', ['$event']) onDragEnd(e: DragEvent) {
    e.preventDefault();
  }

  ngOnInit(): void {

    this.el.nativeElement.draggable = true;

  }

}
