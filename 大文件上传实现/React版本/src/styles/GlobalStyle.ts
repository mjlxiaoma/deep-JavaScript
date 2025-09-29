import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  /* 全局样式重置 */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
    background-color: #f5f5f5;
    color: #333;
    line-height: 1.6;
  }

  #root {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* 滚动条样式 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* 拖拽区域样式 */
  .drag-over {
    border: 2px dashed #1890ff !important;
    background-color: rgba(24, 144, 255, 0.1) !important;
  }

  .drag-active {
    border: 2px dashed #52c41a !important;
    background-color: rgba(82, 196, 26, 0.1) !important;
  }

  /* 动画类 */
  .fade-enter {
    opacity: 0;
  }

  .fade-enter-active {
    opacity: 1;
    transition: opacity 300ms;
  }

  .fade-exit {
    opacity: 1;
  }

  .fade-exit-active {
    opacity: 0;
    transition: opacity 300ms;
  }

  .slide-up-enter {
    transform: translateY(20px);
    opacity: 0;
  }

  .slide-up-enter-active {
    transform: translateY(0);
    opacity: 1;
    transition: transform 300ms, opacity 300ms;
  }

  .slide-up-exit {
    transform: translateY(0);
    opacity: 1;
  }

  .slide-up-exit-active {
    transform: translateY(-20px);
    opacity: 0;
    transition: transform 300ms, opacity 300ms;
  }

  /* Ant Design 自定义样式 */
  .ant-upload-drag {
    transition: all 0.3s ease;
  }

  .ant-upload-drag:hover {
    border-color: #1890ff;
  }

  .ant-progress-line {
    .ant-progress-bg {
      transition: width 0.3s ease;
    }
  }

  .ant-card {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  }

  .ant-btn {
    transition: all 0.3s ease;
  }

  .ant-table {
    .ant-table-tbody > tr:hover > td {
      background: rgba(24, 144, 255, 0.05);
    }
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }

    .ant-layout-header {
      padding: 0 16px !important;
      
      h1 {
        font-size: 18px !important;
      }
    }

    .ant-layout-content {
      padding: 16px !important;
    }

    .ant-card {
      margin-bottom: 16px;
    }

    .ant-table-wrapper {
      .ant-table-content {
        overflow-x: auto;
      }
    }
  }

  @media (max-width: 480px) {
    .ant-layout-header {
      padding: 0 12px !important;
      
      h1 {
        font-size: 16px !important;
      }
    }

    .ant-layout-content {
      padding: 12px !important;
    }

    .ant-btn {
      font-size: 12px;
      padding: 4px 8px;
    }
  }

  /* 打印样式 */
  @media print {
    body {
      background: white !important;
    }

    .ant-layout-header,
    .ant-layout-footer {
      display: none !important;
    }

    .ant-btn,
    .ant-upload {
      display: none !important;
    }
  }

  /* 深色模式支持 */
  @media (prefers-color-scheme: dark) {
    /* 这里可以添加深色模式样式 */
  }

  /* 高对比度模式支持 */
  @media (prefers-contrast: high) {
    .ant-btn {
      border-width: 2px;
    }
  }

  /* 动画偏好设置 */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`

export default GlobalStyle 