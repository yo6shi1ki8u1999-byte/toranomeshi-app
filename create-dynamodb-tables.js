const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb')

const client = new DynamoDBClient({ region: 'ap-northeast-1' })

async function createPostsTable() {
  try {
    // テーブルが既に存在するか確認
    const listCommand = new ListTablesCommand({})
    const tables = await client.send(listCommand)
    
    if (tables.TableNames.includes('Posts')) {
      console.log('Posts table already exists')
      return
    }
    
    const params = {
      TableName: 'Posts',
      KeySchema: [
        { AttributeName: 'postId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'postId', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    }
    
    const command = new CreateTableCommand(params)
    await client.send(command)
    console.log('Posts table created successfully')
  } catch (error) {
    console.error('Error creating Posts table:', error)
  }
}

async function createCommentsTable() {
  try {
    const listCommand = new ListTablesCommand({})
    const tables = await client.send(listCommand)
    
    if (tables.TableNames.includes('Comments')) {
      console.log('Comments table already exists')
      return
    }
    
    const params = {
      TableName: 'Comments',
      KeySchema: [
        { AttributeName: 'postId', KeyType: 'HASH' },
        { AttributeName: 'commentId', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'postId', AttributeType: 'S' },
        { AttributeName: 'commentId', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    }
    
    const command = new CreateTableCommand(params)
    await client.send(command)
    console.log('Comments table created successfully')
  } catch (error) {
    console.error('Error creating Comments table:', error)
  }
}

async function main() {
  await createPostsTable()
  await createCommentsTable()
  console.log('All tables created')
}

main()
