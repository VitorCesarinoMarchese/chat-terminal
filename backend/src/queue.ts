import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from './db';

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

export const messageQueue = new Queue('messages', { connection });

export const worker = new Worker(
  'messages',
  async job => {
    const { user, text, timestamp } = job.data;
    console.log('Mensagem recebida na fila:', job.data);

    await db.message.create({ data: { user, text, timestamp: new Date(timestamp) } });
  },
  { connection }
);
