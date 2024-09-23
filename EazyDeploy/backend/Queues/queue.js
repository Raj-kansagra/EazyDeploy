import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// Initialize Redis connection
const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Create and export the deploy queue
export const deployQueue = new Queue('deployingQueue', { connection });
