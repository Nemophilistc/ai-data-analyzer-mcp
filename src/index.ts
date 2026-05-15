#!/usr/bin/env node
// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import { DataAnalyzerServer } from './server.js';

const server = new DataAnalyzerServer();
server.run().catch(console.error);
