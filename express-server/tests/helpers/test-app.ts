import type { Express } from 'express';
import { createApp } from '../../src/app.js';

let appInstance: Express | null = null;

export function getTestApp(): Express {
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}
