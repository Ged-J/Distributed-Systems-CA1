#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {DistributedSystemsCA1Stack} from '../lib/Distributed-Systems-CA1-stack';

const app = new cdk.App();
new DistributedSystemsCA1Stack(app, 'DistributedSystemsCA1Stack', {

    env: { region: "eu-west-1" } 

});