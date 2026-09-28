import { AppConfig } from '../app/core/config/app-config';

export const TEST_CONFIG: AppConfig = {
  name: 'test',
  production: false,
  appName: 'Test Social',
  apiBaseUrl: 'http://api.test',
  wsBaseUrl: 'ws://api.test',
  feedPageSize: 2,
  httpRetryCount: 0,
  httpRetryDelayMs: 1,
  wsMaxReconnectDelayMs: 10,
  postMaxLength: 280,
};
