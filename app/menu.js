var menuTemplate = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Finding Aid Project',
        accelerator: 'CmdOrCtrl+N',
        click (item, focusedWindow) {
          const createWindow = require('./main.js');
          createWindow();
        }
      },
      {
        label: 'New Standard Project',
        accelerator: 'CmdOrCtrl+Shift+N',
        click(item, focusedWindow) {
          const createWindow = require('./main.js');
          createWindow('standard');
        }
      },
      {
        label: 'Open Project...',
        accelerator: 'CmdOrCtrl+O',
        click(item, focusedWindow) {
          if (!focusedWindow) {
            const createWindow = require('./main.js');
            var win = createWindow();
            win.webContents.once('did-finish-load', () => {
              win.webContents.send('open-project');
            });
          }
          else {
            focusedWindow.webContents.send('open-project');
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('save-project');
        }
      },
      {
        label: 'Save As...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('save-as-project');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Export To',
        submenu: [
          {
            label: 'Preservation SIP...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-preservation');
            }
          },
          {
            label: 'Access DIP...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-access');
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Both...',
            click(item, focusedWindow) {
              if (!focusedWindow) return;
              focusedWindow.webContents.send('export-both');
            }
          }
        ]
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo'
      },
      {
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        role: 'cut'
      },
      {
        role: 'copy'
      },
      {
        role: 'paste'
      },
      {
        role: 'delete'
      },
      {
        role: 'selectall'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences...',
        accelerator: 'CmdOrCtrl+,',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('show-preferences');
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'togglefullscreen'
      },
      {
        label: 'Developer',
        submenu: [
          {
            label: 'Toggle Developer Tools',
            accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click (item, focusedWindow) {
              if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
          },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click (item, focusedWindow) {
              if (focusedWindow) focusedWindow.reload()
            }
          }
        ]
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      }
    ]
  }
];

if (process.platform === 'darwin') {
  const name = require('electron').app.getName();
  menuTemplate.unshift({
    label: name,
    submenu: [
      {
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        label: 'Preferences...',
        click(item, focusedWindow) {
          if (!focusedWindow) return;
          focusedWindow.webContents.send('show-preferences');
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        role: 'hide'
      },
      {
        role: 'hideothers'
      },
      {
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  })

  // File menu
  menuTemplate[1].submenu = menuTemplate[1].submenu.slice(0, -2);

  // Edit menu.
  menuTemplate[2].submenu = menuTemplate[2].submenu.slice(0, -2);
  menuTemplate[2].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking'
        },
        {
          role: 'stopspeaking'
        }
      ]
    }
  )
  // Window menu.
  menuTemplate[4].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}

module.exports.menuTemplate = menuTemplate;
