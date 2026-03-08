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
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { v4: uuidv4 } = require('uuid')

// S3設定
const s3Client = new S3Client({ region: process.env.AWS_REGION })
const BUCKET_NAME = process.env.BUCKET_NAME || 'toranomeshi-photos-bucket'

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


/****************************
* POST methods *
****************************/

// POST /upload - S3署名付きURL生成
app.post('/upload', async function(req, res) {
  try {
    const { fileName, fileType } = req.body
    
    // バリデーション
    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fileName and fileType are required'
      })
    }
    
    // ファイル形式検証（JPG、PNG、GIF のみ許可）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only JPG, PNG, and GIF are allowed'
      })
    }
    
    // ユニークなファイル名を生成
    const fileExtension = fileName.split('.').pop()
    const uniqueFileName = `${uuidv4()}.${fileExtension}`
    const key = `photos/${uniqueFileName}`
    
    // 署名付きURL生成（15分間有効）
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType
    })
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })
    
    // 公開URLを生成
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    
    res.json({
      success: true,
      uploadUrl: signedUrl,
      photoUrl: publicUrl,
      key: key
    })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL',
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
