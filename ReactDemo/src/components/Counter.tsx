import { useState } from 'react'
import './Counter.css'

interface CounterProps {
  initialValue?: number
}

/**
 * 计数器组件示例
 * 演示了 useState Hook 的使用
 */
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

