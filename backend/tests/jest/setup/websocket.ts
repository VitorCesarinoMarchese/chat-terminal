import WebSocket from "ws";

type MessageQueue = {
  frames: string[];
  onMessage: (data: WebSocket.RawData) => void;
};

const messageQueues = new WeakMap<WebSocket, MessageQueue>();

function ensureMessageQueue(socket: WebSocket) {
  const existing = messageQueues.get(socket);
  if (existing) {
    return existing;
  }

  const frames: string[] = [];
  const onMessage = (data: WebSocket.RawData) => {
    frames.push(data.toString());
  };

  const queue = { frames, onMessage };
  messageQueues.set(socket, queue);
  socket.on("message", onMessage);
  return queue;
}

function clearMessageQueue(socket: WebSocket) {
  const queue = messageQueues.get(socket);
  if (!queue) {
    return;
  }

  socket.off("message", queue.onMessage);
  messageQueues.delete(socket);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function openSocket(url: string) {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("WebSocket open timeout")), 2000);
    socket.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  ensureMessageQueue(socket);
  return socket;
}

export function sendJson(socket: WebSocket, payload: Record<string, unknown>) {
  socket.send(JSON.stringify(payload));
}

export async function waitForJsonMessage(
  socket: WebSocket,
  predicate: (value: Record<string, unknown>) => boolean,
  timeoutMs = 5000
) {
  const deadline = Date.now() + timeoutMs;
  const queue = ensureMessageQueue(socket);

  while (Date.now() < deadline) {
    for (let index = 0; index < queue.frames.length; ) {
      const raw = queue.frames[index] as string;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (predicate(parsed)) {
          queue.frames.splice(index, 1);
          return parsed;
        }
        index += 1;
      } catch {
        queue.frames.splice(index, 1);
      }
    }

    if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      throw new Error("WebSocket closed before expected message");
    }

    await sleep(25);
  }

  throw new Error("Timed out waiting for matching WebSocket payload");
}

export async function closeSocket(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) {
    clearMessageQueue(socket);
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      socket.off("close", onClose);
      if (socket.readyState !== WebSocket.CLOSED) {
        socket.terminate();
      }
      resolve();
    }, 2000);

    const onClose = () => {
      clearTimeout(timeout);
      resolve();
    };

    socket.once("close", onClose);

    if (socket.readyState === WebSocket.CLOSING) {
      return;
    }

    if (socket.readyState === WebSocket.CONNECTING) {
      socket.once("open", () => socket.close());
      return;
    }

    socket.close();
  });

  clearMessageQueue(socket);
}
