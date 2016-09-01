const {app, BrowserWindow, Menu} = require('electron');
const pkg = require('./package.json');

var mainWindow = null;

const menuTemplate = [
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
        role: 'selectall'
      }
    ]
  }
];

if (process.platform === 'darwin') {
  const name = pkg.productName;
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
  });
}

app.on('window-all-closed', function(){
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', function(){
  mainWindow = new BrowserWindow({
    title: pkg.productName,
    icon: 'resources/app-icon.png'
  });

  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function(){
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});
