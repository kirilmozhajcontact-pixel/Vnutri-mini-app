/**
 * Storage layer — all localStorage access goes through here.
 */
const MoodAppStorage = (function () {
  const { STORAGE_KEYS, DEFAULT_ENABLED_WIDGETS } = MoodAppConfig;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUserProfile() {
    return readJSON(STORAGE_KEYS.userProfile, null);
  }

  function saveUserProfile(profile) {
    writeJSON(STORAGE_KEYS.userProfile, profile);
  }

  function getEnabledWidgets() {
    const stored = readJSON(STORAGE_KEYS.enabledWidgets, null);
    if (stored) return { ...DEFAULT_ENABLED_WIDGETS, ...stored };
    return { ...DEFAULT_ENABLED_WIDGETS };
  }

  function saveEnabledWidgets(widgets) {
    writeJSON(STORAGE_KEYS.enabledWidgets, widgets);
  }

  function getEntries() {
    return readJSON(STORAGE_KEYS.entries, []);
  }

  function saveEntry(entry) {
    const entries = getEntries();
    entries.push(entry);
    entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    writeJSON(STORAGE_KEYS.entries, entries);
    return entry;
  }

  function deleteEntry(id) {
    const entries = getEntries().filter((e) => e.id !== id);
    writeJSON(STORAGE_KEYS.entries, entries);
  }

  function clearAllData() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }

  function isOnboardingCompleted() {
    const profile = getUserProfile();
    return Boolean(profile && profile.onboarding_completed);
  }

  function getEntriesCount() {
    return getEntries().length;
  }

  function resetOnboarding() {
    const profile = getUserProfile();
    if (profile) {
      profile.onboarding_completed = false;
      saveUserProfile(profile);
    } else {
      saveUserProfile({
        telegram_user_id: null,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        tracking_goals: [],
        checkin_frequency: 'manual',
      });
    }
  }

  return {
    getUserProfile,
    saveUserProfile,
    getEnabledWidgets,
    saveEnabledWidgets,
    getEntries,
    saveEntry,
    deleteEntry,
    clearAllData,
    isOnboardingCompleted,
    getEntriesCount,
    resetOnboarding,
  };
})();
