import * as cdk from "aws-cdk-lib"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { Construct } from 'constructs'

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction;
  productsAdminHandler: lambdaNodeJS.NodejsFunction;
  ordersHandler: lambdaNodeJS.NodejsFunction;
  orderEventsFetchHandler: lambdaNodeJS.NodejsFunction;
}

export class EcommerceApiStack extends cdk.Stack {

  private productsAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
  private customerPool: cognito.UserPool;
  private adminPool: cognito.UserPool;

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

    this.createCognitoAuth()

    this.createProductsService(props, api)

    this.createOrdersServices(props, api) 

  }

  private createCognitoAuth() {
    //Cognito customer Userpool
    this.customerPool = new cognito.UserPool(this, "CustomerPool", {
      userPoolName: "CustomerPool",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
        phone: false
      },
      userVerification: {
        emailSubject: "Verify your email for our ECommerce App!",
        emailBody: "Hello {username}, Thanks for signing up to our ECommerce App! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      signInAliases: {
        username: false,
        email: true
      },
      standardAttributes: {
        fullname: {
          required: true,
          mutable: false
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3)
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    })

    this.customerPool.addDomain("CustomerDomain", {
      cognitoDomain: {
        domainPrefix: "fs-ecommerce-customer"
      }
    })

    const customerWebScope = new cognito.ResourceServerScope({
      scopeName: "web",
      scopeDescription: "Access for web clients"
    })

    const customerMobileScope = new cognito.ResourceServerScope({
      scopeName: "mobile",
      scopeDescription: "Access for mobile clients"
    })

  }

  private createOrdersServices(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler)

    const ordersResource = api.root.addResource("orders")

    //GET /orders
    //GET /orders?email=user@email.com
    //GET /orders?email=user@email.com&orderId=123
    ordersResource.addMethod("GET", ordersIntegration)
    
    //DELETE /orders?email=user@email.com&orderId=123
    const orderDeletionValidator = new apigateway.RequestValidator(this, "OrderDeletionValidator", {
      restApi: api,
      requestValidatorName: "OrderDeletionValidator",
      validateRequestParameters: true,
    })

    ordersResource.addMethod("DELETE", ordersIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.orderId': true
      },
      requestValidator: orderDeletionValidator
    })

    //POST /orders
    const orderRequestValidator = new apigateway.RequestValidator(this, "orderRequestValidator", {
      restApi: api,
      requestValidatorName: "Order request validator",
      validateRequestBody: true
    })
    const orderModel = new apigateway.Model(this, "OrderModel", {
      modelName: "OrderModel",
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING
          },
          productIds: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: {
              type: apigateway.JsonSchemaType.STRING
            }
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ["CASH", "DEBIT_CARD", "CREDIT_CARD"]
          }
        },
        required: [
          "email",
          "productIds",
          "payment"
        ]
      }
    })

    ordersResource.addMethod("POST", ordersIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: {
        "application/json": orderModel
      }
    })
    
    // /orders/events
    const orderEventsResource = ordersResource.addResource("events")

    const orderEventsFetchValidator = new apigateway.RequestValidator(this, "orderEventsFetchValidator", {
      restApi: api,
      requestValidatorName: "OrderEventsFetchValidator",
      validateRequestParameters: true,
    })

    const orderEventsFunctionIntegration = new apigateway.LambdaIntegration(props.orderEventsFetchHandler)
    //GET /orders/events?email=email=felipe@gmail.com
    //GET /orders/events?email=email=felipe@gmail.com&eventType=ORDER_CREATED

    orderEventsResource.addMethod("GET", orderEventsFunctionIntegration, {
      requestParameters: {
        'method.request.querystring.email': true,
        'method.request.querystring.eventType': false,
      },
      requestValidator: orderEventsFetchValidator
    })
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
    const productRequestValidator = new apigateway.RequestValidator(this, "productRequestValidator", {
      restApi: api,
      requestValidatorName: "Product request validator",
      validateRequestBody: true
    })
    const productModel = new apigateway.Model(this, "productModel", {
      modelName: "productModel",
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          productName: {
            type: apigateway.JsonSchemaType.STRING
          },
          code: {
            type: apigateway.JsonSchemaType.STRING,
          },
          price: {
            type: apigateway.JsonSchemaType.NUMBER,
          },
          model: {
            type: apigateway.JsonSchemaType.STRING,
          },
        },
        required: [
          "productName",
          "code",
          "price"
        ]
      }
    })
    productsResource.addMethod("POST", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel
      }
    })

    // Route PUT /products/{id}
    productsResource.addMethod("PUT", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel
      }
    })

    // Route DELETE /products/{id}
    productIdResource.addMethod("DELETE", productsAdminIntegration)
  }
}