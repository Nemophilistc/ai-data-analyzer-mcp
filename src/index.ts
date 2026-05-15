#!/usr/bin/env node

import { DataAnalyzerServer } from './server.js';

const server = new DataAnalyzerServer();
server.run().catch(console.error);
