'use strict';

const electron = require("electron");

const { app, BrowserWindow } = electron;

var win;

function createWindow() {
    win = new BrowserWindow({
        width: 600,
        height: 600,
        webPreferences: { nodeIntegration: true }
    });

    win.loadURL("file://" + __dirname + "/index.html");
}

app.on("ready", createWindow);