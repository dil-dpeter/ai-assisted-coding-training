import type { Todo } from '../types/Todo';

const TODOS_STORAGE_KEY = 'todos';

/**
 * Validates that the provided data is a valid array of Todo objects
 */
export function isValidTodos(data: unknown): data is Todo[] {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every(item => {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.description === 'string' &&
      typeof item.completed === 'boolean' &&
      (typeof item.createdAt === 'string' || item.createdAt instanceof Date)
    );
  });
}

/**
 * Loads todos from sessionStorage
 * Returns empty array if no data, parse error, or validation failure
 */
export function loadTodos(): Todo[] {
  try {
    const stored = window.sessionStorage.getItem(TODOS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!isValidTodos(parsed)) {
      console.warn('Invalid todos data in sessionStorage, clearing and starting fresh');
      window.sessionStorage.removeItem(TODOS_STORAGE_KEY);
      return [];
    }

    // Convert createdAt strings back to Date objects
    return parsed.map(todo => ({
      ...todo,
      createdAt: new Date(todo.createdAt),
    }));
  } catch (error) {
    console.warn('Failed to load todos from sessionStorage:', error);
    window.sessionStorage.removeItem(TODOS_STORAGE_KEY);
    return [];
  }
}

/**
 * Saves todos to sessionStorage
 * Returns a function to display toast message on quota error
 */
export function saveTodos(todos: Todo[]): ((showToast: (message: string) => void) => void) | null {
  try {
    const serialized = JSON.stringify(todos);
    window.sessionStorage.setItem(TODOS_STORAGE_KEY, serialized);
    return null; // No error
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded - your latest changes may not be saved');
      return (showToast: (message: string) => void) => {
        showToast('Storage quota exceeded – your latest changes may not be saved.');
      };
    } else {
      console.error('Failed to save todos to sessionStorage:', error);
      return null;
    }
  }
}
