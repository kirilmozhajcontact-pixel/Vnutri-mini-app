/**
 * Safe Telegram Mini App initialization.
 */
const MoodAppTelegram = (function () {
  let webApp = null;
  let user = null;

  function init() {
    try {
      if (
        typeof window !== 'undefined' &&
        window.Telegram &&
        window.Telegram.WebApp
      ) {
        webApp = window.Telegram.WebApp;
        webApp.ready();
        webApp.expand();

        if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
          user = webApp.initDataUnsafe.user;
        }

        applyTheme();
        return { available: true, user };
      }
    } catch (e) {
      console.warn('Telegram WebApp init skipped:', e);
    }

    return { available: false, user: null };
  }

  function applyTheme() {
    if (!webApp || !webApp.themeParams) return;
    const tp = webApp.themeParams;
    const root = document.documentElement;
    if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color);
    if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color);
  }

  function getUser() {
    return user;
  }

  function getUserId() {
    return user ? user.id : null;
  }

  function isAvailable() {
    return webApp !== null;
  }

  function hapticLight() {
    try {
      if (webApp && webApp.HapticFeedback) {
        webApp.HapticFeedback.impactOccurred('light');
      }
    } catch (_) {}
  }

  return {
    init,
    getUser,
    getUserId,
    isAvailable,
    hapticLight,
  };
})();
