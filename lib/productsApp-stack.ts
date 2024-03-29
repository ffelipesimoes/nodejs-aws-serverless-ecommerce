import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import * as iam from "aws-cdk-lib/aws-iam"
import * as sqs from "aws-cdk-lib/aws-sqs"

import { Construct } from 'constructs'

interface ProductsAppStackProps extends cdk.StackProps {
  eventDdb: dynamodb.Table
}

export class ProductsAppStack extends cdk.Stack {

  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
  readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
  readonly productsDdb: dynamodb.Table

  constructor(scope: Construct, id: string, props: ProductsAppStackProps){
    super(scope, id, props)

    this.productsDdb = new dynamodb.Table(this, "ProductsDdb", {
      tableName: "products",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1
    })

    //Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn" )
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)

    //Product Events Layer
    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductEventsLayerVersionArn" )
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductEventsLayerVersionArn", productEventsLayerArn)

    const productEventsDlq = new sqs.Queue(this, "productEventsDlq", {
      queueName: "product-events-dlq",
      retentionPeriod: cdk.Duration.days(10)
    })

    //Auth user info layer
    const authUserInfoLayerArn = ssm.StringParameter.valueForStringParameter(this, "AuthUserInfoLayerVersionArn")
    const authUserInfoLayer = lambda.LayerVersion.fromLayerVersionArn(this, "AuthUserInfoLayerVersionArn", authUserInfoLayerArn)

     const productsEventsHandler = new lambdaNodeJS.NodejsFunction(this,
      "ProductEventsFunction", {
         functionName: "ProductEventsFunction",
         entry: "lambda/products/productEventsFunction.ts",
         handler: "handler",
         memorySize: 128,
         timeout: cdk.Duration.seconds(2),
         bundling: {
           minify: true,
           sourceMap: false
         },
         environment: {
           EVENTS_DDB: props.eventDdb.tableName
         },
         deadLetterQueueEnabled: true,
         deadLetterQueue: productEventsDlq,
         layers: [productEventsLayer],
         tracing: lambda.Tracing.ACTIVE,
         insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
       }
     )

     props.eventDdb.grantWriteData(productsEventsHandler)

    this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this,
       "ProductsFetchFunction", {
          functionName: "ProductsFetchFunction",
          entry: "lambda/products/productsFetchFunction.ts",
          handler: "handler",
          memorySize: 128,
          timeout: cdk.Duration.seconds(5),
          bundling: {
            minify: true,
            sourceMap: false
          },
          environment: {
            PRODUCTS_DDB: this.productsDdb.tableName
          },
          layers: [productsLayer],
          tracing: lambda.Tracing.ACTIVE,
          insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        }
      )

      this.productsDdb.grantReadData(this.productsFetchHandler)

      this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this,
        "ProductsAdminFunction", {
           functionName: "ProductsAdminFunction",
           entry: "lambda/products/productsAdminFunction.ts",
           handler: "handler",
           memorySize: 128,
           timeout: cdk.Duration.seconds(5),
           bundling: {
             minify: true,
             sourceMap: false
           },
           environment: {
             PRODUCTS_DDB: this.productsDdb.tableName,
             PRODUCT_EVENTS_FUNCTION_NAME: productsEventsHandler.functionName

           },
           layers: [productsLayer, productEventsLayer, authUserInfoLayer],
           tracing: lambda.Tracing.ACTIVE,
           insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0
        }
      )

      this.productsDdb.grantWriteData(this.productsAdminHandler)

      productsEventsHandler.grantInvoke(this.productsAdminHandler)

      const eventsDdbPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["dynamodb:PutItem"],
        resources: [props.eventDdb.tableArn],
        conditions: {
          ['ForAllValues:StringLike'] : {
            'dynamodb:LeadingKeys': ['#product_*']
          }
        }
      })
  
      productsEventsHandler.addToRolePolicy(eventsDdbPolicy)
  }
}
