/**
 * @format
 */

// react-native-gesture-handler must be imported FIRST so its native
// module is registered before any screen code touches it. Same for
// react-native-reanimated — its worklets runtime must be available
// when @gorhom/bottom-sheet mounts.
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {mark as markStartup} from './src/utils/startupPerf';

// 59.3: cold-start timing baseline — first JS statement after bundle eval
markStartup('js-start');

AppRegistry.registerComponent(appName, () => App);