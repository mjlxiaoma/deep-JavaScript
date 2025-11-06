# 🧩 组件使用示例

本文档提供了项目中所有组件的使用示例和代码片段。

---

## 📦 Counter 组件

### 基本使用

```tsx
import Counter from './components/Counter'

function App() {
  return <Counter />
}
```

### 带初始值

```tsx
<Counter initialValue={100} />
```

### 完整示例

```tsx
import { useState } from 'react'
import Counter from './components/Counter'

function App() {
  return (
    <div>
      <h1>计数器示例</h1>
      <Counter initialValue={0} />
      <Counter initialValue={10} />
      <Counter initialValue={-5} />
    </div>
  )
}
```

### Props 说明

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| initialValue | number | 0 | 计数器初始值 |

### 组件源码

```tsx
// src/components/Counter.tsx
import { useState } from 'react'
import './Counter.css'

interface CounterProps {
  initialValue?: number
}

export default function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue)

  const increment = () => setCount(count + 1)
  const decrement = () => setCount(count - 1)
  const reset = () => setCount(initialValue)

  return (
    <div className="counter-container">
      <h2>计数器示例</h2>
      <div className="counter-display">
        <span className="counter-value">{count}</span>
      </div>
      <div className="counter-buttons">
        <button onClick={decrement} className="btn btn-danger">
          - 减少
        </button>
        <button onClick={reset} className="btn btn-secondary">
          重置
        </button>
        <button onClick={increment} className="btn btn-primary">
          + 增加
        </button>
      </div>
    </div>
  )
}
```

---

## 📝 TodoList 组件

### 基本使用

```tsx
import TodoList from './components/TodoList'

function App() {
  return <TodoList />
}
```

### 完整示例

```tsx
import TodoList from './components/TodoList'

function App() {
  return (
    <div className="app">
      <h1>我的待办事项</h1>
      <TodoList />
    </div>
  )
}
```

### 功能说明

| 功能 | 操作 | 说明 |
|------|------|------|
| 添加任务 | 输入文本 + 点击添加 | 支持回车键快速添加 |
| 完成任务 | 点击复选框 | 切换完成状态 |
| 删除任务 | 点击 ✕ 按钮 | 永久删除任务 |
| 查看统计 | 自动显示 | 显示未完成任务数 |

### 组件源码

```tsx
// src/components/TodoList.tsx
import { useState } from 'react'
import './TodoList.css'

interface Todo {
  id: number
  text: string
  completed: boolean
}

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

  const activeTodos = todos.filter((todo) => !todo.completed).length

  return (
    <div className="todo-container">
      <h2>📝 待办事项</h2>
      
      <div className="todo-input-group">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
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
```

---

## 🎨 样式自定义

### Counter 组件样式

修改 `src/components/Counter.css` 来自定义样式：

```css
/* 修改背景渐变 */
.counter-container {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* 修改按钮颜色 */
.btn-primary {
  background: #ff6b6b;
}
```

### TodoList 组件样式

修改 `src/components/TodoList.css` 来自定义样式：

```css
/* 修改容器样式 */
.todo-container {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
}

/* 修改输入框样式 */
.todo-input {
  border-color: #6c757d;
}
```

---

## 🔄 组件组合示例

### 示例 1: 多个计数器

```tsx
function App() {
  return (
    <div className="counters-grid">
      <Counter initialValue={0} />
      <Counter initialValue={10} />
      <Counter initialValue={20} />
    </div>
  )
}
```

### 示例 2: 条件渲染

```tsx
function App() {
  const [showTodo, setShowTodo] = useState(false)

  return (
    <div>
      <button onClick={() => setShowTodo(!showTodo)}>
        切换显示
      </button>
      {showTodo ? <TodoList /> : <Counter />}
    </div>
  )
}
```

### 示例 3: 带标签的组件

```tsx
function App() {
  return (
    <div>
      <section>
        <h2>计数器</h2>
        <Counter initialValue={5} />
      </section>
      
      <section>
        <h2>待办事项</h2>
        <TodoList />
      </section>
    </div>
  )
}
```

---

## 📱 响应式布局示例

### 网格布局

```css
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
}
```

```tsx
function App() {
  return (
    <div className="components-grid">
      <Counter initialValue={0} />
      <TodoList />
    </div>
  )
}
```

### 弹性布局

```css
.components-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}
```

```tsx
function App() {
  return (
    <div className="components-flex">
      <Counter initialValue={0} />
      <Counter initialValue={10} />
      <TodoList />
    </div>
  )
}
```

---

## 🧪 测试示例

### 单元测试（建议使用 Vitest）

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Counter from './Counter'

test('counter increments when button clicked', () => {
  render(<Counter initialValue={0} />)
  const button = screen.getByText(/增加/)
  fireEvent.click(button)
  expect(screen.getByText('1')).toBeInTheDocument()
})
```

---

## 🎯 实战练习

### 练习 1: 修改 Counter
- [ ] 添加步长控制（每次增加 5）
- [ ] 添加最大值限制
- [ ] 添加最小值限制
- [ ] 添加重置确认对话框

### 练习 2: 扩展 TodoList
- [ ] 添加编辑功能
- [ ] 添加优先级标记
- [ ] 添加截止日期
- [ ] 添加分类功能
- [ ] 实现本地存储

### 练习 3: 创建新组件
- [ ] 创建一个表单组件
- [ ] 创建一个模态框组件
- [ ] 创建一个通知组件
- [ ] 创建一个加载动画组件

---

## 💡 提示

### 组件开发最佳实践
1. **单一职责** - 每个组件只做一件事
2. **Props 类型** - 使用 TypeScript 定义清晰的 Props
3. **状态管理** - 合理使用 useState
4. **命名规范** - 使用有意义的变量名
5. **代码复用** - 提取公共逻辑

### 性能优化建议
1. 使用 `React.memo` 避免不必要的重渲染
2. 使用 `useCallback` 缓存函数
3. 使用 `useMemo` 缓存计算结果
4. 避免在渲染中创建新对象

---

**开始创建你自己的组件吧！** 🚀

