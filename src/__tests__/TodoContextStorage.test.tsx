import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodoProvider } from '../contexts/TodoContext';
import { useTodo } from '../hooks/useTodo';

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

// Test component that uses the TodoContext
const TestComponent = () => {
  const { todos, addTodo } = useTodo();

  return (
    <div>
      <button onClick={() => addTodo('Test Todo', 'Test Description')}>Add Todo</button>
      <div data-testid="todo-count">{todos.length}</div>
      {todos.map(todo => (
        <div key={todo.id} data-testid={`todo-${todo.id}`}>
          {todo.title}: {todo.description}
        </div>
      ))}
    </div>
  );
};

describe('TodoContext with sessionStorage', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  it('should hydrate todos from sessionStorage on initialization', () => {
    // Pre-populate sessionStorage with test data
    const existingTodos = [
      {
        id: '1',
        title: 'Existing Todo',
        description: 'From storage',
        completed: false,
        createdAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingTodos));

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(screen.getByTestId('todo-count').textContent).toBe('1');
    expect(screen.getByTestId('todo-1')).toHaveTextContent('Existing Todo: From storage');
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('todos');
  });

  it('should start with empty state when no sessionStorage data', () => {
    mockSessionStorage.getItem.mockReturnValue(null);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(screen.getByTestId('todo-count').textContent).toBe('0');
    expect(mockSessionStorage.getItem).toHaveBeenCalledWith('todos');
  });

  it('should persist todos to sessionStorage when state changes', async () => {
    const user = userEvent.setup();
    mockSessionStorage.getItem.mockReturnValue(null);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Initially no todos
    expect(screen.getByTestId('todo-count').textContent).toBe('0');

    // Add a todo
    await act(async () => {
      await user.click(screen.getByText('Add Todo'));
    });

    // Check that the todo was added
    expect(screen.getByTestId('todo-count').textContent).toBe('1');

    // Check that sessionStorage.setItem was called
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'todos',
      expect.stringContaining('Test Todo')
    );
  });

  it('should handle corrupt sessionStorage data gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockSessionStorage.getItem.mockReturnValue('invalid json {');

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Should start with empty state despite corrupt data
    expect(screen.getByTestId('todo-count').textContent).toBe('0');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');

    consoleSpy.mockRestore();
  });

  it('should handle quota exceeded error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockSessionStorage.getItem.mockReturnValue(null);

    const quotaError = new Error('QuotaExceededError');
    quotaError.name = 'QuotaExceededError';

    // Mock setItem to throw quota error on any call
    mockSessionStorage.setItem.mockImplementation(() => {
      throw quotaError;
    });

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Add a todo which should trigger the quota error
    await act(async () => {
      await user.click(screen.getByText('Add Todo'));
    });

    // Should have logged the warning
    expect(consoleSpy).toHaveBeenCalledWith(
      'Storage quota exceeded - your latest changes may not be saved'
    );

    // Todo should still be added to in-memory state
    expect(screen.getByTestId('todo-count').textContent).toBe('1');

    consoleSpy.mockRestore();
  });
});
