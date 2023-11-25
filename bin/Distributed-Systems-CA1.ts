#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import {DistributedSystemsCA1Stack} from '../lib/Distributed-Systems-CA1-stack';

const app = new App();
new DistributedSystemsCA1Stack(app, 'DistributedSystemsCA1Stack', {
  
 
});