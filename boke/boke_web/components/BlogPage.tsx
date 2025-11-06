'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface BlogPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
}

export default function BlogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // 获取博客列表
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('获取博客列表失败:', error);
      // 使用模拟数据
      setPosts([
        {
          id: 1,
          title: 'JavaScript 异步编程深度解析',
          content: '异步编程是JavaScript的核心特性之一。本文将深入探讨Promise、async/await以及事件循环机制...',
          author: 'TechBlo团队',
          createdAt: '2025-01-15',
          views: 1250,
          likes: 89,
        },
        {
          id: 2,
          title: 'React Hooks 最佳实践指南',
          content: 'React Hooks 为我们提供了更优雅的函数组件开发方式。本文分享一些实用的最佳实践和常见陷阱...',
          author: 'TechBlo团队',
          createdAt: '2025-01-14',
          views: 980,
          likes: 67,
        },
        {
          id: 3,
          title: 'Node.js 性能优化实战',
          content: '在大规模应用中，Node.js的性能优化至关重要。本文将介绍一些实用的优化技巧和工具...',
          author: 'TechBlo团队',
          createdAt: '2025-01-13',
          views: 756,
          likes: 54,
        },
        {
          id: 4,
          title: 'TypeScript 高级类型系统',
          content: 'TypeScript的类型系统非常强大，本文将深入探讨泛型、条件类型、映射类型等高级特性...',
          author: 'TechBlo团队',
          createdAt: '2025-01-12',
          views: 634,
          likes: 42,
        },
        {
          id: 5,
          title: '微前端架构设计与实现',
          content: '微前端是一种将多个独立的前端应用组合成一个整体的架构模式。本文将介绍其设计思路和实现方案...',
          author: 'TechBlo团队',
          createdAt: '2025-01-11',
          views: 523,
          likes: 38,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span className="text-2xl font-bold text-gray-800">TechBlo</span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.avatar && (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <span className="text-gray-700">{user.username || user.name}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-2">欢迎回来！</h1>
          <p className="text-blue-100">探索最新的技术文章和社区动态</p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                  {post.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {post.author}
                  </span>
                  <span>{post.createdAt}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {post.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {post.likes}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">暂无博客文章</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>© 2025 TechBlog. 保留所有权</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="text-blue-600 hover:underline">隐私政策</a>
              <span className="text-gray-400">|</span>
              <a href="#" className="text-blue-600 hover:underline">使用条款</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

