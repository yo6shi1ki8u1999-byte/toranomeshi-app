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
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb')
const { v4: uuidv4 } = require('uuid')

// DynamoDB設定
const client = new DynamoDBClient({ region: process.env.AWS_REGION })
const ddbDocClient = DynamoDBDocumentClient.from(client)
const COMMENTS_TABLE = process.env.COMMENTS_TABLE || 'Comments'

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
 * GET methods *
 **********************/

// GET /comments?postId={postId} - 特定投稿のコメント一覧取得
app.get('/comments', async function(req, res) {
  try {
    const { postId } = req.query
    
    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'postId query parameter is required'
      })
    }
    
    const params = {
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: 'postId = :postId',
      ExpressionAttributeValues: {
        ':postId': postId
      }
    }
    
    const result = await ddbDocClient.send(new QueryCommand(params))
    
    // 時系列順にソート（古い順）
    const comments = result.Items.sort((a, b) => a.createdAt - b.createdAt)
    
    res.json({
      success: true,
      comments: comments
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments',
      message: error.message
    })
  }
});

/****************************
* POST methods *
****************************/

// POST /comments - コメント投稿
app.post('/comments', async function(req, res) {
  try {
    const { postId, userName, commentText } = req.body
    
    // バリデーション
    if (!postId || !commentText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: postId and commentText are required'
      })
    }
    
    const commentId = uuidv4()
    const timestamp = Date.now()
    
    const comment = {
      postId: postId,
      commentId: commentId,
      userName: userName || '匿名',
      commentText: commentText,
      createdAt: timestamp
    }
    
    const params = {
      TableName: COMMENTS_TABLE,
      Item: comment
    }
    
    await ddbDocClient.send(new PutCommand(params))
    
    res.json({
      success: true,
      comment: comment
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create comment',
      message: error.message
    })
  }
});

app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
