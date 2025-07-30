import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

const TestComponent = () => {
  const { todos, addTodo, toggleTodoCompletion, deleteTodo } = useTodo();

  return (
    <div>
      <button data-testid="add-todo" onClick={() => addTodo('Test Todo', 'Test Description')}>
        Add Todo
      </button>
      <div data-testid="todo-count">{todos.length}</div>
      {todos.map(todo => (
        <div key={todo.id} data-testid={`todo-item-${todo.id}`}>
          <span data-testid={`todo-title-${todo.id}`}>{todo.title}</span>
          <span data-testid={`todo-desc-${todo.id}`}>{todo.description}</span>
          <span data-testid={`todo-completed-${todo.id}`}>
            {todo.completed ? 'Completed' : 'Not completed'}
          </span>
          <button data-testid={`toggle-${todo.id}`} onClick={() => toggleTodoCompletion(todo.id)}>
            Toggle
          </button>
          <button data-testid={`delete-${todo.id}`} onClick={() => deleteTodo(todo.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

describe('TodoContext', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    mockSessionStorage.clear();
    vi.clearAllMocks();
    // Ensure getItem returns null for fresh state
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  it('provides empty todos array initially', () => {
    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(screen.getByTestId('todo-count').textContent).toBe('0');
  });

  it('can add a new todo', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await user.click(screen.getByTestId('add-todo'));

    expect(screen.getByTestId('todo-count').textContent).toBe('1');
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('can toggle todo completion status', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await user.click(screen.getByTestId('add-todo'));

    const todoId =
      screen.getByTestId('todo-count').textContent === '1'
        ? screen
            .getByText('Test Todo')
            .closest('[data-testid^="todo-item-"]')
            ?.getAttribute('data-testid')
            ?.replace('todo-item-', '')
        : '';

    expect(screen.getByTestId(`todo-completed-${todoId}`).textContent).toBe('Not completed');

    await user.click(screen.getByTestId(`toggle-${todoId}`));

    expect(screen.getByTestId(`todo-completed-${todoId}`).textContent).toBe('Completed');
  });

  it('can delete a todo', async () => {
    const user = userEvent.setup();

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await user.click(screen.getByTestId('add-todo'));

    expect(screen.getByTestId('todo-count').textContent).toBe('1');

    const todoId =
      screen.getByTestId('todo-count').textContent === '1'
        ? screen
            .getByText('Test Todo')
            .closest('[data-testid^="todo-item-"]')
            ?.getAttribute('data-testid')
            ?.replace('todo-item-', '')
        : '';

    await user.click(screen.getByTestId(`delete-${todoId}`));

    expect(screen.getByTestId('todo-count').textContent).toBe('0');
  });
});
