import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import {
  ipcRenderer,
  dialog,
  remote,
  shell,
  app,
  Menu,
  MenuItem,
  webContents
} from 'electron';
import * as childProcess from 'child_process';

@Injectable()
export class ElectronService {

  ipcRenderer: typeof ipcRenderer;
  childProcess: typeof childProcess;
  dialog: typeof dialog;
  remote: typeof remote;
  shell: typeof shell;
  app: typeof app;
  Menu: typeof Menu;
  MenuItem: typeof MenuItem;
  webContents: typeof webContents;

  constructor() {
    // Conditional imports
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.childProcess = window.require('child_process');
      this.remote = window.require('electron').remote;
      this.shell = window.require('electron').shell;
      this.dialog = this.remote.dialog;
      this.app = this.remote.app;
      this.Menu = this.remote.Menu;
      this.MenuItem = this.remote.MenuItem;
      this.webContents = this.remote.webContents;
    }
  }

  isElectron = () => {
    return window && window.process && window.process.type;
  }

}
