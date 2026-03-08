import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { postsAPI, uploadAPI } from '../api'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { GOOGLE_PLACES_API_KEY } from '../config'
import './PostForm.css'

function PostForm() {
  const navigate = useNavigate()
  const shopNameInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [formData, setFormData] = useState({
    shopName: '',
    shopAddress: '',
    shopPlaceId: '',
    photoFile: null,
    photoPreview: null,
    priceRating: 3,
    tasteRating: 3,
    waitTimeRating: 3,
    initialComment: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Google Places Autocomplete初期化
  useEffect(() => {
    // Google Places Autocompleteは一旦無効化
    // APIキーの設定が完了したら有効化できます
    /*
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Google Places API key not found')
      return
    }

    const initAutocomplete = async () => {
      try {
        // Google Maps APIの設定
        setOptions({
          apiKey: GOOGLE_PLACES_API_KEY,
          version: 'weekly'
        })

        // Places ライブラリをインポート
        const { Autocomplete } = await importLibrary('places')
        const { LatLng, Circle } = await importLibrary('core')

        if (!shopNameInputRef.current) return

        const autocomplete = new Autocomplete(
          shopNameInputRef.current,
          {
            types: ['establishment'],
            componentRestrictions: { country: 'jp' },
            fields: ['name', 'formatted_address', 'place_id', 'geometry']
          }
        )

        // 虎ノ門エリアにバイアスをかける
        const toranomon = new LatLng(35.6681, 139.7514)
        const circle = new Circle({
          center: toranomon,
          radius: 1000
        })
        autocomplete.setBounds(circle.getBounds())

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place && place.name) {
            setFormData(prev => ({
              ...prev,
              shopName: place.name,
              shopAddress: place.formatted_address || '',
              shopPlaceId: place.place_id || ''
            }))
          }
        })

        autocompleteRef.current = autocomplete
      } catch (err) {
        console.error('Google Maps API loading error:', err)
      }
    }

    initAutocomplete()
    */
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRatingChange = (ratingType, value) => {
    setFormData(prev => ({
      ...prev,
      [ratingType]: parseInt(value)
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // ファイルサイズチェック（5MB以下）
      if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズは5MB以下にしてください')
        return
      }

      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        alert('JPG、PNG、GIF形式の画像のみアップロード可能です')
        return
      }

      // プレビュー生成
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photoFile: file,
          photoPreview: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // バリデーション
    if (!formData.shopName.trim()) {
      alert('店名を入力してください')
      return
    }

    try {
      setSubmitting(true)
      let photoUrl = ''

      // 写真がある場合はアップロード
      if (formData.photoFile) {
        setUploadProgress('写真をアップロード中...')
        
        // 署名付きURL取得
        const uploadResponse = await uploadAPI.getUploadUrl(
          formData.photoFile.name,
          formData.photoFile.type
        )

        // S3にアップロード
        await uploadAPI.uploadFile(formData.photoFile, uploadResponse.uploadUrl)
        photoUrl = uploadResponse.photoUrl
        
        setUploadProgress('投稿を作成中...')
      }

      // 投稿作成
      const postData = {
        shopName: formData.shopName.trim(),
        shopAddress: formData.shopAddress.trim(),
        photoUrl: photoUrl,
        ratings: {
          price: formData.priceRating,
          taste: formData.tasteRating,
          waitTime: formData.waitTimeRating
        },
        initialComment: formData.initialComment.trim()
      }

      const response = await postsAPI.create(postData)
      
      // 成功したら詳細ページへ遷移
      navigate(`/post/${response.post.postId}`)
    } catch (err) {
      alert('投稿の作成に失敗しました: ' + err.message)
      console.error('Error creating post:', err)
    } finally {
      setSubmitting(false)
      setUploadProgress('')
    }
  }

  return (
    <div className="post-form-container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 一覧に戻る
      </button>

      <div className="post-form-card">
        <h1>新規投稿</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shopName">店名 *</label>
            <input
              ref={shopNameInputRef}
              type="text"
              id="shopName"
              name="shopName"
              value={formData.shopName}
              onChange={handleInputChange}
              placeholder="例：虎ノ門カフェ"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shopAddress">住所（任意）</label>
            <input
              type="text"
              id="shopAddress"
              name="shopAddress"
              value={formData.shopAddress}
              onChange={handleInputChange}
              placeholder="例：東京都港区虎ノ門1-1-1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="photo">写真（任意）</label>
            <input
              type="file"
              id="photo"
              accept="image/jpeg,image/jpg,image/png,image/gif"
              onChange={handlePhotoChange}
            />
            {formData.photoPreview && (
              <div className="photo-preview">
                <img src={formData.photoPreview} alt="プレビュー" />
              </div>
            )}
          </div>

          <div className="ratings-section">
            <h3>評価</h3>
            
            <div className="rating-group">
              <label>💰 安さ: {formData.priceRating}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.priceRating}
                onChange={(e) => handleRatingChange('priceRating', e.target.value)}
                className="rating-slider"
              />
              <div className="rating-labels">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div className="rating-group">
              <label>😋 旨さ: {formData.tasteRating}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.tasteRating}
                onChange={(e) => handleRatingChange('tasteRating', e.target.value)}
                className="rating-slider"
              />
              <div className="rating-labels">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div className="rating-group">
              <label>⏱️ 待ち時間（短いほど高評価）: {formData.waitTimeRating}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.waitTimeRating}
                onChange={(e) => handleRatingChange('waitTimeRating', e.target.value)}
                className="rating-slider"
              />
              <div className="rating-labels">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="initialComment">コメント（任意）</label>
            <textarea
              id="initialComment"
              name="initialComment"
              value={formData.initialComment}
              onChange={handleInputChange}
              placeholder="お店の感想を書いてください..."
              rows="4"
            />
          </div>

          {uploadProgress && (
            <div className="upload-progress">{uploadProgress}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/')}
              disabled={submitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PostForm
