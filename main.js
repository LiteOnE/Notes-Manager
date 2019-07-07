const { app, BrowserWindow } = require('electron')

function createWindow() {
    // Создаем окно браузера.
    let win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false
    })

    // and load the index.html of the app.
    win.loadFile('src/index.html')
}

app.on('ready', createWindow)