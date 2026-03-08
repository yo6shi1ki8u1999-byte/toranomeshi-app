/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/




const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')
const { v4: uuidv4 } = require('uuid')

// DynamoDB設定
const client = new DynamoDBClient({ region: process.env.AWS_REGION })
const ddbDocClient = DynamoDBDocumentClient.from(client)
const POSTS_TABLE = process.env.POSTS_TABLE || 'Posts'

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});


/**********************
 * Example get method *
 **********************/

// GET /posts - 投稿一覧取得
app.get('/posts', async function(req, res) {
  try {
    const params = {
      TableName: POSTS_TABLE
    }
    
    const result = await ddbDocClient.send(new ScanCommand(params))
    
    // 最新順にソート
    const posts = result.Items.sort((a, b) => b.createdAt - a.createdAt)
    
    res.json({
      success: true,
      posts: posts
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      message: error.message
    })
  }
})

// GET /posts/:postId - 投稿詳細取得
app.get('/posts/:postId', async function(req, res) {
  try {
    const { postId } = req.params
    
    const params = {
      TableName: POSTS_TABLE,
      Key: {
        postId: postId
      }
    }
    
    const result = await ddbDocClient.send(new GetCommand(params))
    
    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      })
    }
    
    res.json({
      success: true,
      post: result.Item
    })
  } catch (error) {
    console.error('Error fetching post:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch post',
      message: error.message
    })
  }
})

/****************************
* Example post method *
****************************/

// POST /posts - 投稿作成
app.post('/posts', async function(req, res) {
  try {
    const { shopName, shopAddress, shopPlaceId, shopLocation, photoUrl, ratings, initialComment } = req.body
    
    // バリデーション
    if (!shopName || !ratings) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shopName and ratings are required'
      })
    }
    
    // 評価値の検証（1-5の範囲）
    if (ratings.price < 1 || ratings.price > 5 ||
        ratings.taste < 1 || ratings.taste > 5 ||
        ratings.waitTime < 1 || ratings.waitTime > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating values must be between 1 and 5'
      })
    }
    
    const postId = uuidv4()
    const timestamp = Date.now()
    
    const post = {
      postId,
      shopName,
      shopAddress: shopAddress || '',
      shopPlaceId: shopPlaceId || '',
      shopLocation: shopLocation || {},
      photoUrl: photoUrl || '',
      ratings: {
        price: ratings.price,
        taste: ratings.taste,
        waitTime: ratings.waitTime
      },
      initialComment: initialComment || '',
      createdAt: timestamp,
      updatedAt: timestamp
    }
    
    const params = {
      TableName: POSTS_TABLE,
      Item: post
    }
    
    await ddbDocClient.send(new PutCommand(params))
    
    res.json({
      success: true,
      post: post
    })
  } catch (error) {
    console.error('Error creating post:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message
    })
  }
})


/****************************
* Example delete method *
****************************/

// DELETE /posts/:postId - 投稿削除
app.delete('/posts/:postId', async function(req, res) {
  try {
    const { postId } = req.params
    
    // 投稿が存在するか確認
    const getParams = {
      TableName: POSTS_TABLE,
      Key: {
        postId: postId
      }
    }
    
    const result = await ddbDocClient.send(new GetCommand(getParams))
    
    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      })
    }
    
    // 投稿を削除
    const deleteParams = {
      TableName: POSTS_TABLE,
      Key: {
        postId: postId
      }
    }
    
    await ddbDocClient.send(new DeleteCommand(deleteParams))
    
    res.json({
      success: true,
      message: 'Post deleted successfully',
      postId: postId
    })
  } catch (error) {
    console.error('Error deleting post:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error.message
    })
  }
})


app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
