import { DynamoDB } from 'aws-sdk'
import { Order, OrderRepository } from '/opt/nodejs/ordersLayer' 
import { Product, ProductRepository } from '/opt/nodejs/productsLayer'

import * as AWSXRay from "aws-xray-sdk"
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from '/opt/nodejs/ordersApiLayer'

AWSXRay.captureAWS(require("aws-sdk"))

const ordersDdb = process.env.ORDERS_DDB!
const productsDdb = process.env.PRODUCTS_DDB!

const ddbClient = new DynamoDB.DocumentClient()

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
          } else {
            //get all orders from an user
          }
        }
      } else {
        //get all orders
      }

    } else if (method === "POST"){
      console.log("/POST Order")

    } else if (method === "DELETE"){
      console.log("/DELETE Order")   
      const email = event.queryStringParameters!.email
      const orderId = event.queryStringParameters!.orderId   

    }

    return{
      statusCode: 400,
      body: "bad request"
    }
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
