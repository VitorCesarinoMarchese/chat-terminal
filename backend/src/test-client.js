const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('[CLIENTE] Conectado ao servidor');

  ws.send(JSON.stringify({
    type: 'login',
    username: 'vitor',
    password: '123'
  }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'message',
      text: 'Minha terceira mensagem!'
    }));
  }, 1000);                                                                                                                                                                                 
});

ws.on('message', (msg) => {
  console.log('[SERVIDOR]:', msg.toString());
});
                                                                                                                                                        