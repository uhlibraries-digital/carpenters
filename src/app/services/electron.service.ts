import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer } from 'electron';
import { dialog } from 'electron';
import { remote } from 'electron';
import { shell } from 'electron';
import * as childProcess from 'child_process';
let { app, Menu, MenuItem, webContents } = remote;

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  childProcess: typeof childProcess;
  dialog: typeof dialog;
  remote: typeof remote;
  app: typeof app;
  shell: typeof shell;
  Menu: typeof Menu;
  MenuItem: typeof MenuItem;
  webContents: typeof webContents;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.childProcess = window.require('child_process');
      this.remote = remote;
      this.app = app;
      this.dialog = this.remote.dialog;
      this.Menu = Menu;
      this.MenuItem = MenuItem;
      this.shell = shell;
      this.webContents = webContents;
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

}
