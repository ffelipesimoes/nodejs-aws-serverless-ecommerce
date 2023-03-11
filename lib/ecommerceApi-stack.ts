import * as cdk from "aws-cdk-lib"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
}

export class EcommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps){
    super(scope, id, props)

    const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs")
    logGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    const api = new apigateway.RestApi(this, "ECommerceApi", {
      restApiName: "ECommerceApi",
      cloudWatchRole: true,

      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip:true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          status: true,
          caller: true,
          user:true,
          responseLength: true
        })
      }
    })

    this.createProductsService(props, api)

    this.createOrdersServices(props, api) 

  }

  private createOrdersServices(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler)

    const ordersResource = api.root.addResource("orders")

    //GET /orders
    //GET /orders?user@email.com
    //GET /orders?user@email.com&orderId=123
    ordersResource.addMethod("GET", ordersIntegration)
    
    //DELETE /orders?user@email.com&orderId=123
    ordersResource.addMethod("DELETE", ordersIntegration)

    //POST /orders
    ordersResource.addMethod("POST", ordersIntegration)


  }

  private createProductsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)
    
    const productsResource = api.root.addResource("products")

    // Route GET /products
    productsResource.addMethod("GET", productsFetchIntegration)

    // Route GET /products/{id}
    const productIdResource = productsResource.addResource("{id}")
    productIdResource.addMethod("GET", productsFetchIntegration)

    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)

    // Route POST /products
    productsResource.addMethod("POST", productsAdminIntegration)

    // Route PUT /products/{id}
    productIdResource.addMethod("PUT", productsAdminIntegration)

    // Route DELETE /products/{id}
    productIdResource.addMethod("DELETE", productsAdminIntegration)
  }
}