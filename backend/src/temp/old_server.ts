import type { WebSocket as WebSocketType } from 'ws';
import WebSocket from 'ws';
import { db } from './old_db';
import { messageQueue } from './old_queue';
import * as bcrypt from 'bcrypt';

interface AuthenticatedSocket extends WebSocketType {
  user?: string;
}

const wss = new WebSocket.Server({ port: 3000 });
const SALT_ROUNDS = 10;

export { wss };

wss.on('connection', (socket) => {
  const ws = socket as AuthenticatedSocket;
  console.log('Novo cliente conectado');

  ws.user = undefined;

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'login') {
        const { username, password } = data;

        let user = await db.user.findUnique({ where: { username } });

        if (!user) {
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          user = await db.user.create({
            data: {
              username,
              password: hashedPassword,
            }
          });

          await db.session.create({
            data: {
              userId: user.id,
              isOnline: true
            }
          });

          ws.send(JSON.stringify({ type: 'login-success', newUser: true }));
          console.log(`Novo usuário criado: ${username}`);
        } else {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            ws.send(JSON.stringify({ type: 'login-error', error: 'Senha incorreta' }));
            ws.close();
            return;
          }

          await db.session.upsert({
            where: { userId: user.id },
            update: { isOnline: true },
            create: { userId: user.id, isOnline: true }
          });

          ws.send(JSON.stringify({ type: 'login-success', newUser: false }));
          console.log(`Usuário autenticado: ${username}`);
        }

        ws.user = username;

        const history = await db.message.findMany({
          orderBy: { timestamp: 'asc' },
          take: 50
        });

        ws.send(JSON.stringify({
          type: 'history',
          messages: history
        }));

        return;
      }

      if (data.type === 'message') {
        if (!ws.user) {
          ws.send(JSON.stringify({ type: 'error', message: 'Faça login primeiro!' }));
          return;
        }

        await messageQueue.add('new-message', {
          user: ws.user,
          text: data.text,
          timestamp: Date.now()
        });
      }

    } catch (err) {
      console.error('Erro ao processar mensagem:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
    }
  });

  ws.on('close', async () => {
    if (ws.user) {
      const user = await db.user.findUnique({ where: { username: ws.user } });
      if (user) {
        await db.session.updateMany({
          where: { userId: user.id },
          data: { isOnline: false }
        });
        console.log(`Usuário desconectado: ${ws.user}`);
      }
    }
  });
});

console.log('Servidor WebSocket rodando na porta 3000');
