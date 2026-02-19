/**
 * Capacitor Native Bridge
 * Handles native API integrations for Android/iOS
 * This file is only active when running inside Capacitor
 */

let StatusBar, SplashScreen;

async function initNative() {
  if (!window.Capacitor) return; // Not in native context

  try {
    // Dynamic imports for Capacitor plugins
    const { Capacitor } = await import('@capacitor/core');
    
    if (Capacitor.isNativePlatform()) {
      console.log('Running on:', Capacitor.getPlatform());

      // Status bar (dark theme)
      try {
        const statusBarModule = await import('@capacitor/status-bar');
        StatusBar = statusBarModule.StatusBar;
        await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
        await StatusBar.setStyle({ style: 'DARK' });
      } catch (e) {
        console.log('StatusBar plugin not available:', e);
      }

      // Hide splash screen after app loads
      try {
        const splashModule = await import('@capacitor/splash-screen');
        SplashScreen = splashModule.SplashScreen;
        await SplashScreen.hide();
      } catch (e) {
        console.log('SplashScreen plugin not available:', e);
      }

      // Handle Android back button
      if (Capacitor.getPlatform() === 'android') {
        document.addEventListener('backbutton', () => {
          const app = window.app;
          if (app && app.currentRoute !== 'home') {
            app.navigate('home');
          }
        });
      }

      // Keep screen awake is handled by the PWA wakeLock
      // Capacitor apps have their own keep-awake via native config
    }
  } catch (e) {
    console.log('Native init skipped (not in Capacitor):', e);
  }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNative);
} else {
  initNative();
}
