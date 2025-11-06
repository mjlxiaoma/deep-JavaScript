import { useState } from 'react'
import './TodoList.css'

interface Todo {
  id: number
  text: string
  completed: boolean
}

/**
 * 待办事项列表组件
 * 演示了状态管理和列表渲染
 */
export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [inputValue, setInputValue] = useState('')

  const addTodo = () => {
    if (inputValue.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputValue,
        completed: false,
      }
      setTodos([...todos, newTodo])
      setInputValue('')
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  // 失去焦点时的处理
  const handleBlur = () => {
    // 如果有内容，自动添加任务
    if (inputValue.trim()) {
      // addTodo()
    }
  }

  const activeTodos = todos.filter((todo) => !todo.completed).length

  return (
    <div className="todo-container">
      <h2>📝 待办事项</h2>
      
      <div className="todo-input-group">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          placeholder="添加新任务..."
          className="todo-input"
        />
        <button onClick={addTodo} className="add-btn">
          添加
        </button>
      </div>

      <div className="todo-stats">
        还有 {activeTodos} 个任务待完成
      </div>

      <ul className="todo-list">
        {todos.length === 0 ? (
          <li className="empty-state">暂无任务，添加一个吧！</li>
        ) : (
          todos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="todo-checkbox"
              />
              <span className="todo-text">{todo.text}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="delete-btn"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

