/// <reference path="../typings/index.d.ts" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { AppModule } from './app.module';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const platform = platformBrowserDynamic();
if (process.env.NODE_ENV === 'production') {
  enableProdMode();
}
platform.bootstrapModule(AppModule);
