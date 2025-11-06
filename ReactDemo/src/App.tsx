import { useState } from "react";
import Counter from "./components/Counter";
import TodoList from "./components/TodoList";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [showCounter, setShowCounter] = useState(true);

  return (
    <>
      {/* <div className="header">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div> */}

      <h1>🚀 React Demo 项目</h1>

      <p className="subtitle">
        使用 <strong>React 19</strong> + <strong>TypeScript</strong> +{" "}
        <strong>Vite</strong>
      </p>

      <div className="toggle-section">
        <button
          className="toggle-btn"
          onClick={() => setShowCounter(!showCounter)}
        >
          {showCounter ? "切换到待办事项" : "切换到计数器"}
        </button>
      </div>

      <div className="demo-section">
        {/* 使用 display 控制显示隐藏，而不是条件渲染，这样可以保持状态 */}
        <div style={{ display: showCounter ? 'block' : 'none' }}>
          <Counter initialValue={0} />
        </div>
        <div style={{ display: showCounter ? 'none' : 'block' }}>
          <TodoList />
        </div>
      </div>

      <footer className="footer">
        <p>
          💡 编辑 <code>src/App.tsx</code> 即可开始开发
        </p>
        <p className="tech-info">点击上方按钮切换不同的示例组件</p>
      </footer>
    </>
  );
}

export default App;
