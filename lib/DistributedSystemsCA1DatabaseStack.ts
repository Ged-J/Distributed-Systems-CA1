import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { review } from '../seed/reviews';

export class DynamoDBStack extends cdk.Stack {
    usersTable: dynamodb.Table;
    reviewsTable: dynamodb.Table;
    
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
    
        // DynamoDB table for reviews
   
        this.reviewsTable = new dynamodb.Table(this, 'reviewsTable', {
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          partitionKey: { name: 'movieId', type: dynamodb.AttributeType.NUMBER },
          sortKey: { name: 'reviewerName', type: dynamodb.AttributeType.STRING },
          tableName: 'reviewsTable',
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        
        // Global Secondary Index for ReviewerId
        this.reviewsTable.addGlobalSecondaryIndex({
                indexName: 'reviewerNameIndex',
            partitionKey: { name: 'reviewerName', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'reviewDate', type: dynamodb.AttributeType.STRING },
        });
          
          //GlobalSecondaryIndex for querying by reviewDate
        this.reviewsTable.addGlobalSecondaryIndex({
            indexName: 'reviewDateIndex',
            partitionKey: { name: 'movieId', type: dynamodb.AttributeType.NUMBER }, 
        sortKey: { name: 'reviewDate', type: dynamodb.AttributeType.STRING },
        });
        
        // DynamoDB table for users
        this.usersTable = new dynamodb.Table(this, 'Users', {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            tableName: 'Users',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          });
    
        // Seed data
        new custom.AwsCustomResource(this, 'SeedData', {
            onCreate: {
              service: "DynamoDB",
              action: "batchWriteItem",
              parameters: {
                RequestItems: {
                  [this.reviewsTable.tableName]: generateBatch(review),
            },
        },
        physicalResourceId: custom.PhysicalResourceId.of(Date.now().toString()),
        },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
            resources: custom.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
            
        });
    }
}