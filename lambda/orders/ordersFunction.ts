import { DynamoDB, SNS } from 'aws-sdk'
import { Order, OrderRepository } from '/opt/nodejs/ordersLayer' 
import { Product, ProductRepository } from '/opt/nodejs/productsLayer'

import * as AWSXRay from "aws-xray-sdk"
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from '/opt/nodejs/ordersApiLayer'
import { OrderEvent, OrderEventType, Envelope } from '/opt/nodejs/orderEventsLayer'

AWSXRay.captureAWS(require("aws-sdk"))

const ordersDdb = process.env.ORDERS_DDB!
const productsDdb = process.env.PRODUCTS_DDB!
const orderEventsTopicArn = process.env.ORDER_EVENTS_TOPIC_ARN!

const ddbClient = new DynamoDB.DocumentClient()
const snsClient = new SNS()

const orderRepository = new OrderRepository(ddbClient, ordersDdb)
const productRepository = new ProductRepository(ddbClient, productsDdb)


export async function handler(
  event:APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

    const method = event.httpMethod
    const apiRequestId = event.requestContext.requestId
    const lambdaRequestId = context.awsRequestId

    console.log(`API Gateway RequestId: ${apiRequestId} - lambda RequestId: ${lambdaRequestId}`)

    if (method === "GET"){
      if(event.queryStringParameters) {
        const email = event.queryStringParameters!.email
        const orderId = event.queryStringParameters!.orderId
        if(email) {
          if(orderId){
            //get one order from an user
            try {
              const orders = await orderRepository.getOrder(email, orderId)
              return{
                statusCode: 200,
                body: JSON.stringify(convertToOrderResponse(orders))
              }
            } catch (error) {
              console.log((<Error>error).message)
              return{
                statusCode: 400,
                body: (<Error>error).message
              }
            }
          } else {
            //get all orders from an user
            const orders = await orderRepository.getOrdersByEmail(email)
            return{
              statusCode: 200,
              body: JSON.stringify(orders.map(convertToOrderResponse))
            }
          }
        }
      } else {
        const orders = await orderRepository.getAllOrders()
        return{
          statusCode: 200,
          body: JSON.stringify(orders.map(convertToOrderResponse))
        }

      }

    } else if (method === "POST"){
      console.log("/POST Order")

      const orderRequest = JSON.parse(event.body!) as OrderRequest
      const products = await productRepository.getProductsByIds(orderRequest.productsIds)
      if(products.length === orderRequest.productsIds.length) {
        const order = buildOrder(orderRequest, products)
        const orderCreated = await orderRepository.createOrder(order)

        const eventResult = await sendOrderEvent(orderCreated, OrderEventType.CREATED, lambdaRequestId)
        console.log(`
        Order created event sent - OrderId: ${orderCreated.sk}
        - MessageId: ${eventResult.MessageId}
        `)

        return{
          statusCode: 201,
          body: JSON.stringify(convertToOrderResponse(orderCreated))
        }
      } else {
        return{
          statusCode: 404,
          body: "Some products was not found"
        }
      }
    } else if (method === "DELETE"){
      console.log("/DELETE Order")   
      const email = event.queryStringParameters!.email!
      const orderId = event.queryStringParameters!.orderId!
      
      try {
        const orderDeleted = await orderRepository.deleteOrder(email, orderId)
        const eventResult = await sendOrderEvent(orderDeleted, OrderEventType.DELETED, lambdaRequestId)
        console.log(`
        Order deleted event sent - OrderId: ${orderDeleted.sk}
        - MessageId: ${eventResult.MessageId}
        `)
        return{
          statusCode: 200,
          body: JSON.stringify(convertToOrderResponse(orderDeleted))
        }
      } catch (error) {
        console.log((<Error>error).message)
        return{
          statusCode: 400,
          body: (<Error>error).message
        }
      }
    }
    
    return{
      statusCode: 400,
      body: "bad request"
    }
}

function sendOrderEvent(order: Order, eventType: OrderEventType, lambdaRequestId: string ) {
  const productCodes: string[] = []
  order.products.forEach((product) => {
    productCodes.push(product.code)
  })

  const orderEvent: OrderEvent = {
    email: order.pk,
    orderId: order.sk!,
    billing: order.billing,
    shipping: order.shipping,
    requestId: lambdaRequestId,
    productCodes: productCodes
  }

  const envelope: Envelope = {
    eventType: eventType,
    data: JSON.stringify(orderEvent)
  }

  return snsClient.publish({
    TopicArn: orderEventsTopicArn,
    Message: JSON.stringify(envelope)
  }).promise()
}

function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = []
  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price
    })
  })

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType
    }
  }

  return orderResponse
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
   const orderProducts: OrderProductResponse[] = []
   let totalPrice = 0
   
   products.forEach((product) => {
    totalPrice += product.price
    orderProducts.push({
      code: product.code,
      price: product.price
    })
   })

   const order: Order = {
    pk: orderRequest.email,
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier
    },
    products: orderProducts
   }

   return order
}
