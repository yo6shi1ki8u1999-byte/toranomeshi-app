import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { postsAPI, commentsAPI } from '../api'
import './PostDetail.css'

function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [userName, setUserName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadPostAndComments()
  }, [postId])

  const loadPostAndComments = async () => {
    try {
      setLoading(true)
      const [postResponse, commentsResponse] = await Promise.all([
        postsAPI.getById(postId),
        commentsAPI.getByPostId(postId)
      ])
      setPost(postResponse.post)
      setComments(commentsResponse.comments || [])
      setError(null)
    } catch (err) {
      setError('投稿の読み込みに失敗しました')
      console.error('Error loading post:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    
    if (!commentText.trim()) {
      alert('コメントを入力してください')
      return
    }

    try {
      setSubmitting(true)
      await commentsAPI.create({
        postId: postId,
        userName: userName.trim() || '匿名',
        commentText: commentText.trim()
      })
      
      setCommentText('')
      setUserName('')
      await loadPostAndComments()
    } catch (err) {
      alert('コメントの投稿に失敗しました')
      console.error('Error submitting comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async () => {
    if (!window.confirm('この投稿を削除してもよろしいですか？')) {
      return
    }

    try {
      setDeleting(true)
      await postsAPI.delete(postId)
      alert('投稿を削除しました')
      navigate('/')
    } catch (err) {
      alert('投稿の削除に失敗しました')
      console.error('Error deleting post:', err)
    } finally {
      setDeleting(false)
    }
  }

  const calculateAverageRating = (ratings) => {
    if (!ratings) return 0
    const { price, taste, waitTime } = ratings
    return ((price + taste + waitTime) / 3).toFixed(1)
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP')
  }

  if (loading) {
    return <div className="post-detail"><div className="loading">読み込み中...</div></div>
  }

  if (error || !post) {
    return (
      <div className="post-detail">
        <div className="error">{error || '投稿が見つかりません'}</div>
        <button onClick={() => navigate('/')}>ホームに戻る</button>
      </div>
    )
  }

  return (
    <div className="post-detail">
      <div className="header-actions">
        <button className="back-button" onClick={() => navigate('/')}>← 一覧に戻る</button>
        <button 
          className="delete-button" 
          onClick={handleDeletePost}
          disabled={deleting}
        >
          {deleting ? '削除中...' : '🗑️ 削除'}
        </button>
      </div>
      <div className="post-detail-card">
        {post.photoUrl && <img src={post.photoUrl} alt={post.shopName} className="post-detail-image" />}
        <div className="post-detail-content">
          <h1>{post.shopName}</h1>
          {post.shopAddress && <p className="shop-address">📍 {post.shopAddress}</p>}
          <div className="ratings-detail">
            <h3>評価</h3>
            <div className="rating-item">💰 安さ: {post.ratings?.price || 0}</div>
            <div className="rating-item">😋 旨さ: {post.ratings?.taste || 0}</div>
            <div className="rating-item">⏱️ 待ち時間: {post.ratings?.waitTime || 0}</div>
            <div className="average-rating-large">総合評価: {calculateAverageRating(post.ratings)}</div>
          </div>
          {post.initialComment && (
            <div className="initial-comment-section">
              <h3>投稿者のコメント</h3>
              <p>{post.initialComment}</p>
            </div>
          )}
          <p className="post-date">投稿日時: {formatDate(post.createdAt)}</p>
        </div>
      </div>
      <div className="comments-section">
        <h2>コメント ({comments.length})</h2>
        <form className="comment-form" onSubmit={handleSubmitComment}>
          <input type="text" placeholder="名前（任意）" value={userName} onChange={(e) => setUserName(e.target.value)} className="comment-input" />
          <textarea placeholder="コメントを入力..." value={commentText} onChange={(e) => setCommentText(e.target.value)} className="comment-textarea" rows="3" />
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? '投稿中...' : 'コメントを投稿'}</button>
        </form>
        <div className="comments-list">
          {comments.length === 0 ? (
            <p className="no-comments">まだコメントがありません</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.commentId} className="comment-item">
                <div className="comment-header">
                  <span className="comment-user">{comment.userName}</span>
                  <span className="comment-date">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="comment-text">{comment.commentText}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default PostDetail
