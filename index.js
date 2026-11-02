/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Registrar ambos identificadores para compatibilidad total con MainActivity nativa
AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('CamperSitesTemp', () => App);
AppRegistry.registerComponent('CamperSitesPro', () => App);
