import React, { useState, useEffect } from 'react';
import type { Todo } from '../types/Todo';
import { v4 as uuidv4 } from 'uuid';
import { TodoContext } from './TodoContextType';
import { loadTodos, saveTodos } from '../utils/sessionStorage';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast/Toast';

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with data from sessionStorage
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos());
  const { toast, showToast, hideToast } = useToast();

  // Persist todos to sessionStorage whenever they change
  useEffect(() => {
    const handleSaveError = saveTodos(todos);
    if (handleSaveError) {
      handleSaveError((message: string) => showToast(message, 'warning'));
    }
  }, [todos, showToast]);

  const addTodo = (title: string, description: string) => {
    const newTodo: Todo = {
      id: uuidv4(),
      title,
      description,
      completed: false,
      createdAt: new Date(),
    };
    setTodos([...todos, newTodo]);
  };

  const editTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, ...updates } : todo)));
  };

  const toggleTodoCompletion = (id: string) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <>
      <TodoContext.Provider value={{ todos, addTodo, editTodo, toggleTodoCompletion, deleteTodo }}>
        {children}
      </TodoContext.Provider>
      <Toast
        message={toast.message}
        severity={toast.severity}
        open={toast.open}
        onClose={hideToast}
      />
    </>
  );
};

// No re-exports to avoid react-refresh/only-export-components error
