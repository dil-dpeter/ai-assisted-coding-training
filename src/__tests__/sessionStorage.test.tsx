import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTodos, saveTodos, isValidTodos } from '../utils/sessionStorage';
import type { Todo } from '../types/Todo';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Replace global sessionStorage with mock
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('sessionStorage utilities', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('isValidTodos', () => {
    it('should return true for valid todo array', () => {
      const validTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(validTodos)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isValidTodos([])).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isValidTodos('not an array')).toBe(false);
      expect(isValidTodos(null)).toBe(false);
      expect(isValidTodos(undefined)).toBe(false);
      expect(isValidTodos({})).toBe(false);
    });

    it('should return false for array with invalid todo objects', () => {
      const invalidTodos = [
        {
          id: 123, // should be string
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(invalidTodos)).toBe(false);
    });

    it('should return false for array with missing required properties', () => {
      const invalidTodos = [
        {
          id: '1',
          title: 'Test Todo',
          // missing description
          completed: false,
          createdAt: new Date(),
        },
      ];

      expect(isValidTodos(invalidTodos)).toBe(false);
    });

    it('should accept createdAt as both Date and string', () => {
      const todosWithDateString = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      ];

      expect(isValidTodos(todosWithDateString)).toBe(true);
    });
  });

  describe('loadTodos', () => {
    it('should return empty array when no data in storage', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('todos');
    });

    it('should load and parse valid todos from storage', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const storedData = JSON.stringify(testTodos);
      mockSessionStorage.getItem.mockReturnValue(storedData);

      const result = loadTodos();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Test Todo');
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should clear storage and return empty array for corrupt JSON', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockSessionStorage.getItem.mockReturnValue('invalid json {');

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load todos from sessionStorage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should clear storage and return empty array for invalid todo data', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidData = JSON.stringify([{ invalid: 'data' }]);
      mockSessionStorage.getItem.mockReturnValue(invalidData);

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid todos data in sessionStorage, clearing and starting fresh'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('saveTodos', () => {
    it('should save todos to storage successfully', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const result = saveTodos(testTodos);

      expect(result).toBeNull();
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('todos', JSON.stringify(testTodos));
    });

    it('should handle QuotaExceededError and return toast callback', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      mockSessionStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });

      const testTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const result = saveTodos(testTodos);

      expect(result).toBeInstanceOf(Function);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Storage quota exceeded - your latest changes may not be saved'
      );

      // Test the returned callback
      if (result) {
        const mockShowToast = vi.fn();
        result(mockShowToast);
        expect(mockShowToast).toHaveBeenCalledWith(
          'Storage quota exceeded – your latest changes may not be saved.'
        );
      }

      consoleSpy.mockRestore();
    });

    it('should handle other storage errors and return null', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const otherError = new Error('Some other error');

      mockSessionStorage.setItem.mockImplementation(() => {
        throw otherError;
      });

      const testTodos: Todo[] = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          completed: false,
          createdAt: new Date('2023-01-01'),
        },
      ];

      const result = saveTodos(testTodos);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save todos to sessionStorage:',
        otherError
      );

      consoleSpy.mockRestore();
    });
  });
});
