/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {mark as markStartup} from './src/utils/startupPerf';

// 59.3: cold-start timing baseline — first JS statement after bundle eval
markStartup('js-start');

AppRegistry.registerComponent(appName, () => App);
