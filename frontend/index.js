globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

console.log("🔥 JS ENTRY POINT HIT - index.js is running");
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import '@react-native-firebase/app'; // Initialize Firebase Native App
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

