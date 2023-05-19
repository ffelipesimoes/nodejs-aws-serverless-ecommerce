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
  private productsAdminAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
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

    const postConfirmationHandler = new lambdaNodeJS.NodejsFunction(this, "PostConfirmationFunction", {
      functionName: "PostConfirmationFunction",
      entry: "lambda/auth/postConfirmationFunction.ts",
      handler: "handler",
      memorySize: 128,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
    })

    const preAuthenticationHandler = new lambdaNodeJS.NodejsFunction(this, "PreAuthenticationFunction", {
      functionName: "PreAuthenticationFunction",
      entry: "lambda/auth/preAuthenticationFunction.ts",
      handler: "handler",
      memorySize: 128,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
    })

    //Cognito customer Userpool
    this.customerPool = new cognito.UserPool(this, "CustomerPool", {
      lambdaTriggers: {
        preAuthentication: preAuthenticationHandler,
        postConfirmation: postConfirmationHandler
      },
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

    //Cognito admin UserPool
    this.adminPool = new cognito.UserPool(this, "AdminPool", {
      userPoolName: "AdminPool",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      userInvitation: {
        emailSubject: "Welcome to ECommerce administrator service",
        emailBody: 'Your username is {username} and temporary password is {####}'        
      },
      signInAliases: {
        username: false,
        email: true
      },
      standardAttributes: {
        email: {
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

    this.adminPool.addDomain("AdminDomain", {
      cognitoDomain: {
        domainPrefix: "fs-ecommerce-admin"
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

    const adminWebScope = new cognito.ResourceServerScope({
      scopeName: "web",
      scopeDescription: "Admin web operation"
    })

    const customerResourceServer = this.customerPool.addResourceServer("CustomerResourceServer", {
      identifier: "customer",
      userPoolResourceServerName: "CustomerResourceServer",
      scopes: [
        customerWebScope, 
        customerMobileScope
      ]
    })

    const adminResourceServer = this.adminPool.addResourceServer("AdminResourceServer", {
      identifier: "admin",
      userPoolResourceServerName: "AdminResourceServer",
      scopes: [adminWebScope]
    })

    this.customerPool.addClient("customer-web-client", {
      userPoolClientName: "customerWebClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(customerResourceServer, customerWebScope)
        ],
      }
    })

    this.customerPool.addClient("customer-mobile-client", {
      userPoolClientName: "customerMobileClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(customerResourceServer, customerMobileScope)
        ],
      }
    })

    this.adminPool.addClient("admin-web-client", {
      userPoolClientName: "adminWebClient",
      authFlows: {
        userPassword: true,
      },
      accessTokenValidity: cdk.Duration.minutes(120),
      refreshTokenValidity: cdk.Duration.days(7),
      oAuth: {
        scopes: [
          cognito.OAuthScope.resourceServer(adminResourceServer, adminWebScope)
        ],
      }
    })

   this.productsAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAuthorizer", {
    authorizerName: "ProductsAuthorizer",
    cognitoUserPools: [this.customerPool, this.adminPool]
    })

   this.productsAdminAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ProductsAdminAuthorizer", {
    authorizerName: "ProductsAdminAuthorizer",
    cognitoUserPools: [this.adminPool]
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

    const productsFetchWebMobileIntegrationOption = {
      authorizer: this.productsAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ["customer/web", "customer/mobile", "admin/web"]
    }

    const productsFetchWeIntegrationOption = {
      authorizer: this.productsAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ["customer/web", "admin/web"]
    }

    // Route GET /products
    productsResource.addMethod("GET", productsFetchIntegration, productsFetchWebMobileIntegrationOption)

    // Route GET /products/{id}
    const productIdResource = productsResource.addResource("{id}")
    productIdResource.addMethod("GET", productsFetchIntegration, productsFetchWeIntegrationOption)

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
      },
      authorizer: this.productsAdminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['admin/web']
    })

    // Route PUT /products/{id}
    productsResource.addMethod("PUT", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel
      },
      authorizer: this.productsAdminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['admin/web']
    })

    // Route DELETE /products/{id}
    productIdResource.addMethod("DELETE", productsAdminIntegration,{
      authorizer: this.productsAdminAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['admin/web']
    })
  }
}