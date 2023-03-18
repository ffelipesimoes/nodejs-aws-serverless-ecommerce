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

}