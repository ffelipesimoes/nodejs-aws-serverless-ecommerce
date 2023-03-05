import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export async function handler(
  event:APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  
    const lambdaRequestId = context.awsRequestId
    const apiRequestId = event.requestContext.requestId
    const method = event.httpMethod

    console.log(`API Gateway RequestId: ${apiRequestId} - lambda RequestId: ${lambdaRequestId}`) 
  
    if ( event.resource === "/products") {
      console.log("POST /products")
      return {
        statusCode: 201,
        body: "POST /products" 
      }
    } else if (event.resource === "products/{id}") {
      const productId = event.pathParameters!.id as string 
      
      if(event.httpMethod === "PUT") {
        console.log(`PUT /products/${productId}`)
        return {
          statusCode: 201,
          body: `PUT /products/${productId}`
        }

      } else if (event.httpMethod === "DELETE") {
        console.log(`DELETE /products/${productId}`)
        return {
          statusCode: 201,
          body: `DELETE /products/${productId}`
        }

      }
    }

    return {
      statusCode: 400,
      body: "BAD Request"
    }

  }