export const STORAGE_KEYS = {
  settings: 'codenexus-settings',
  projects: 'codenexus-projects',
  recent: 'codenexus-recent-projects',
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : { language: 'en', theme: 'dark' };
  } catch {
    return { language: 'en', theme: 'dark' };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.projects);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
}

export function persistProject(project) {
  const existing = loadProjects();
  const updated = [project, ...existing.filter((item) => item.id !== project.id)].slice(0, 12);
  saveProjects(updated);
  saveRecentProject(project);

  if ('indexedDB' in window) {
    const request = indexedDB.open('codenexus-db', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put(project);
    };
  }
}

export function saveRecentProject(project) {
  const recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || '[]');
  const next = [project, ...recent.filter((item) => item.id !== project.id)].slice(0, 6);
  localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(next));
}

export function getRecentProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || '[]');
  } catch {
    return [];
  }
}

export function normalizeProject(project) {
  const files = Array.isArray(project.files) ? project.files : [];
  return {
    ...project,
    files: files.map((file) => ({
      id: file.id || `${file.path}-${Date.now()}`,
      path: file.path || 'main.py',
      content: file.content || '',
    })),
  };
}
