import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { remote } from 'electron';

let { Menu, MenuItem } = remote;

import { ArchivesSpaceService } from '../shared/archivesspace.service';

@Component({
  selector: 'tree-view',
  templateUrl: './archivesspace/tree-view.component.html',
  styles: [ require('./tree-view.component.scss') ]
})
export class TreeViewComponent {
  @Input() children: any;

  constructor(
    private asService: ArchivesSpaceService,
    private changeRef: ChangeDetectorRef) {
  }

  toggle(c: any, e): void {
    e.stopPropagation();
    if (c.children.length > 0) {
      c.expanded = !c.expanded;
    }
  }

  onContextMenu(c: any, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    let contextMenu = new Menu();
    if (c.artificial) {
      contextMenu.append(new MenuItem({
        label: 'Remove Object',
        click: () => {
          this.removeChild(c);
        }
      }));
    }
    else {
      contextMenu.append(new MenuItem({
        label: 'Add Object',
        click: () => {
          this.addChild(c);
        }
      }));
    }

    contextMenu.popup(remote.getCurrentWindow());
  }

  displayTitle(c: any): string {
    let title = '';
    if (c.level === 'series') {
      title = 'Series: ';
    }
    if (c.level === 'subseries') {
      title = 'Sub Series: ';
    }

    return c.title;
  }

  displayContainer(c: any): string {
    return this.asService.displayContainer(c);
  }

  hasSelectedChildren(parent: any): boolean {
    let found = false;
    for (let child of parent.children) {
      if (child.selected) {
        return true;
      }
      found = this.hasSelectedChildren(child) || found;
    }
    return found;
  }

  addChild(c: any): void {
    let index = c.children.length;
    c.children.push({
      title: 'Object ' + this.padLeft(index + 1, 3, '0'),
      parent: c,
      index: index,
      selected: true,
      children: [],
      containers: c.containers,
      record_uri: undefined,
      node_type: undefined,
      artificial: true,
      level: c.level
    });
    c.expanded = true;
    this.changeRef.detectChanges();
  }

  removeChild(c: any): void {
    let parent = c.parent;
    let index = parent.children.findIndex(function(e) {
      return e.index === c.index;
    });
    parent.children.splice(index, 1);
    parent.expanded = parent.children.length > 0;
    this.changeRef.detectChanges();
  }

  containerClasses(c): string {
    return ['container', c.level].join(' ');
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }
}
