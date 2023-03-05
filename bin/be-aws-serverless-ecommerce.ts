#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { EcommerceApiStack } from '../lib/ecommerceApi-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: "645543366511",
  region: "us-east-1"
}

const tags = {
  cost: "ECommerce",
  team: "DigitalRegistro"
}

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  tags: tags,
  env: env
})

const eCommerceApiStack = new EcommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsFetchHandler,
  tags: tags,
  env: env,
})

eCommerceApiStack.addDependency(productsAppStack)