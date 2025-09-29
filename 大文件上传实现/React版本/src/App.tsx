import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import { motion } from 'framer-motion'
import UploadPage from './pages/UploadPage'
import GlobalStyle from './styles/GlobalStyle'

const { Header, Content, Footer } = Layout

const App: React.FC = () => {
  return (
    <>
      <GlobalStyle />
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          background: '#fff', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 600,
              color: '#1890ff'
            }}>
              React 断点续传上传系统
            </h1>
          </motion.div>
        </Header>
        
        <Content style={{ 
          padding: '24px', 
          background: '#f5f5f5',
          flex: 1
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ height: '100%' }}
          >
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </motion.div>
        </Content>
        
        <Footer style={{ 
          textAlign: 'center', 
          background: '#fff',
          borderTop: '1px solid #f0f0f0'
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            React File Upload System ©2024 Created with ❤️
          </motion.div>
        </Footer>
      </Layout>
    </>
  )
}

export default App 