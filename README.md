# O projeto
O projeto "nodejs-aws-serverless-ecommerce" é uma aplicação de comércio eletrônico desenvolvida em Node.js usando TypeScript e projetada para ser implantada no ambiente de nuvem da Amazon Web Services (AWS). Neste arquivo README, vou explicar como implantar a aplicação na AWS usando o AWS CDK (Cloud Development Kit).

## Pré-requisitos
Antes de começar, certifique-se de ter as seguintes ferramentas e recursos disponíveis:

* Uma conta AWS ativa e com permissões para criar recursos na AWS
* O AWS CLI instalado em sua máquina local
-- Acesse a página de download do AWS CLI no site oficial da AWS: https://aws.amazon.com/cli/
-- Siga as instruções para o seu sistema operacional para instalar o AWS CLI
-- Abra o terminal e execute o comando `aws --version` para verificar se o AWS CLI foi instalado corretamente
* O AWS CDK instalado em sua máquina local
-- Abra o terminal e execute o comando npm `install -g aws-cdk` para instalar o AWS CDK globalmente
-- Execute o comando `cdk --version` para verificar se o AWS CDK foi instalado corretamente

## Baixando o projeto
Para baixar o projeto, você pode clonar o repositório do GitHub usando o comando abaixo:

```
git clone https://github.com/ffelipesimoes/nodejs-aws-serverless-ecommerce.git
```

## Configurando as credenciais da AWS
Antes de implantar a aplicação na AWS, você precisa configurar as credenciais da AWS em sua máquina local. Abra o terminal e execute o comando abaixo:

```
aws configure
```

Insira suas credenciais da sua API da AWS (chave de acesso e chave secreta) quando solicitado e escolha uma região AWS (por exemplo, "us-east-1").

## Instalando as dependências do projeto
Antes de implantar a aplicação usando o AWS CDK, você precisa instalar as dependências do projeto. Abra o terminal e execute o comando abaixo:

```
cd nodejs-aws-serverless-ecommerce
npm install
```

## Implantando a aplicação usando o AWS CDK
Agora, você pode implantar a aplicação usando o AWS CDK. Abra o terminal e execute os comandos abaixo:

```
cdk bootstrap
cdk deploy
```

O primeiro comando ("cdk bootstrap") criará um bucket S3 para armazenar os artefatos do CDK.

O segundo comando ("cdk deploy") implantará a aplicação na AWS usando o AWS CDK. Você verá uma lista de recursos que serão criados. Se estiver tudo correto, confirme a implantação digitando "y".

Depois que a implantação estiver concluída, você verá um URL que pode usar para acessar a aplicação implantada.

## Excluindo a implantação
Se você quiser excluir a implantação da aplicação, execute o seguinte comando no terminal:

```
cdk destroy
```
Isso excluirá todos os recursos da aplicação implantada.


# The project
The "nodejs-aws-serverless-ecommerce" project is an e-commerce application developed in Node.js using TypeScript and designed to be deployed in the Amazon Web Services (AWS) cloud environment. In this README file, I will explain how to deploy the application on AWS using the AWS CDK (Cloud Development Kit).

## Prerequisites
Before you begin, make sure you have the following tools and resources available:

* An active AWS account with permissions to create resources on AWS
* The AWS CLI installed on your local machine
-- Go to the AWS CLI download page on the official AWS website: https://aws.amazon.com/cli/
-- Follow the instructions for your operating system to install the AWS CLI
-- Open the terminal and run the command `aws --version` to verify that the AWS CLI installed correctly
* The AWS CDK installed on your local machine
-- Open the terminal and run the npm `install -g aws-cdk` command to install the AWS CDK globally
-- Run the `cdk --version` command to verify that the AWS CDK was installed correctly

## Downloading the project
To download the project, you can clone the GitHub repository using the command below:

```
git clone https://github.com/ffelipesimoes/nodejs-aws-serverless-ecommerce.git
```

## Configuring AWS Credentials
Before deploying the application to AWS, you need to configure AWS credentials on your local machine. Open the terminal and run the command below:

```
aws configure
```

Enter your AWS API credentials (access key and secret key) when prompted, and choose an AWS Region (for example, "us-east-1").

## Installing project dependencies
Before deploying the application using the AWS CDK, you need to install the project's dependencies. Open the terminal and run the command below:

```
cd nodejs-aws-serverless-ecommerce
npm install
```

## Deploying the application using the AWS CDK
You can now deploy the application using the AWS CDK. Open the terminal and run the commands below:

```
cdk bootstrap
cdk deploy
```

The first command ("cdk bootstrap") will create an S3 bucket to store the CDK artifacts.

The second command ("cdk deploy") will deploy the application to AWS using the AWS CDK. You will see a list of resources that will be created. If everything is correct, confirm the deployment by typing "y".

Once the deployment is complete, you will see a URL that you can use to access the deployed application.

## Deleting the Deployment
If you want to delete the application deployment, run the following command in the terminal:

```
cdk destroy
```
This will delete all resources from the deployed application.
