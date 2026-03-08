import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsAPI } from '../api'
import './Dashboard.css'

function Dashboard() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await postsAPI.getAll()
      setPosts(response.posts || [])
      setError(null)
    } catch (err) {
      setError('投稿の読み込みに失敗しました')
      console.error('Error loading posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateAverageRating = (ratings) => {
    if (!ratings) return 0
    const { price, taste, waitTime } = ratings
    return ((price + taste + waitTime) / 3).toFixed(1)
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">{error}</div>
        <button onClick={loadPosts}>再試行</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🍱 虎ノ門ランチ情報</h1>
        <button 
          className="btn-primary"
          onClick={() => navigate('/post/new')}
        >
          ＋ 新規投稿
        </button>
      </header>

      {posts.length === 0 ? (
        <div className="empty-state">
          <p>まだ投稿がありません</p>
          <p>最初の投稿をしてみましょう！</p>
        </div>
      ) : (
        <div className="posts-grid">
          {posts.map((post) => (
            <div 
              key={post.postId} 
              className="post-card"
              onClick={() => navigate(`/post/${post.postId}`)}
            >
              {post.photoUrl && (
                <img 
                  src={post.photoUrl} 
                  alt={post.shopName}
                  className="post-image"
                />
              )}
              <div className="post-content">
                <h3>{post.shopName}</h3>
                {post.shopAddress && (
                  <p className="shop-address">{post.shopAddress}</p>
                )}
                <div className="ratings">
                  <div className="rating-item">
                    <span className="rating-label">💰 安さ:</span>
                    <span className="rating-value">{post.ratings?.price || 0}</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">😋 旨さ:</span>
                    <span className="rating-value">{post.ratings?.taste || 0}</span>
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">⏱️ 待ち時間:</span>
                    <span className="rating-value">{post.ratings?.waitTime || 0}</span>
                  </div>
                  <div className="average-rating">
                    <span className="rating-label">平均:</span>
                    <span className="rating-value-large">
                      {calculateAverageRating(post.ratings)}
                    </span>
                  </div>
                </div>
                {post.initialComment && (
                  <p className="initial-comment">{post.initialComment}</p>
                )}
                <p className="post-date">{formatDate(post.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
