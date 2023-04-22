import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface OrderEventsDdb {
  pk: string;
  sk: string;
  ttl: number;
  email: string;
  createdAt: number;
  requestId: string;
  eventType: string;
  info: {
    orderId: string;
    productCodes: string[];
    messageId: string;
  }
}

export class OrderEventRepository {
  private ddbClient: DocumentClient
  private eventDdb: string

  constructor(ddbClient: DocumentClient, eventDdb: string) {
    this.ddbClient = ddbClient
    this.eventDdb = eventDdb
 }

 createOrderEvent(orderEvent: OrderEventsDdb) {
  return this.ddbClient.put({
    TableName: this.eventDdb,
    Item: orderEvent
  }).promise()
 }

 async getOrderEventsByEmail(email: string) {
  const data = await this.ddbClient.query({
    TableName: this.eventDdb,
    IndexName: 'emailIndex',
    KeyConditionExpression: 'email = :email AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':email': email,
      ':prefix': 'ORDER_'
    }
  }).promise()

  return data.Items as OrderEventsDdb[]
 }

 async getOrderEventsByEmailAndEventType(email: string, eventType: string) {
  const data = await this.ddbClient.query({
    TableName: this.eventDdb,
    IndexName: 'emailIndex',
    KeyConditionExpression: 'email = :email AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: {
      ':email': email,
      ':prefix': eventType
    }
  }).promise()

  return data.Items as OrderEventsDdb[]
 }

}