const electron = require('electron');
const {app} = electron;
const {Menu} = electron;
const {BrowserWindow} = electron;
const {menuTemplate} = require('./menu.js');
const pkg = require('../package.json');

function createWindow(route) {
  var win = new BrowserWindow({
    width: 1200,
    height: 900,
    title: pkg.productName,
    icon: 'resources/app-icon.png',
    backgroundColor: '#21252b'
  });

  win.loadURL(`file://${__dirname}/index.html` +
    ((typeof route === 'string') ? `#` + route :  ``));

  //win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  });

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  return win;
}

app.setName(pkg.productName);
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = createWindow
