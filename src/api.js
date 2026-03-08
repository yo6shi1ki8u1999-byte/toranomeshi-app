import { API_CONFIG } from './config'

// 共通API呼び出し関数
async function apiCall(path, options = {}) {
  const url = `${API_CONFIG.endpoint}${path}`
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  const response = await fetch(url, { ...defaultOptions, ...options })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API呼び出しに失敗しました')
  }
  
  return response.json()
}

// Posts API
export const postsAPI = {
  // 投稿一覧取得
  getAll: async () => {
    return apiCall('/posts')
  },
  
  // 投稿詳細取得
  getById: async (postId) => {
    return apiCall(`/posts/${postId}`)
  },
  
  // 投稿作成
  create: async (postData) => {
    return apiCall('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    })
  },
  
  // 投稿削除
  delete: async (postId) => {
    return apiCall(`/posts/${postId}`, {
      method: 'DELETE',
    })
  },
}

// Comments API
export const commentsAPI = {
  // コメント一覧取得
  getByPostId: async (postId) => {
    return apiCall(`/comments?postId=${postId}`)
  },
  
  // コメント投稿
  create: async (commentData) => {
    return apiCall('/comments', {
      method: 'POST',
      body: JSON.stringify(commentData),
    })
  },
}

// Upload API
export const uploadAPI = {
  // 署名付きURL取得
  getUploadUrl: async (fileName, fileType) => {
    return apiCall('/upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    })
  },
  
  // S3にファイルアップロード
  uploadFile: async (file, uploadUrl) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })
    
    if (!response.ok) {
      throw new Error('ファイルのアップロードに失敗しました')
    }
    
    return response
  },
}
