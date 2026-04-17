import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import { websocketController } from "../../../src/controllers/websocket";
import { createServer } from "../../../src/config/server";

export type RunningTestServer = {
  server: HttpServer;
  websocketServer: WebSocketServer;
  baseHttpUrl: string;
  baseWsUrl: string;
};

export async function startTestServer(): Promise<RunningTestServer> {
  const { server } = createServer();
  const websocketServer = new WebSocketServer({ server });
  websocketController(websocketServer);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseHttpUrl = `http://127.0.0.1:${address.port}`;
  const baseWsUrl = `ws://127.0.0.1:${address.port}`;

  return { server, websocketServer, baseHttpUrl, baseWsUrl };
}

export async function stopTestServer(running: RunningTestServer) {
  await new Promise<void>((resolve, reject) => {
    running.websocketServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    running.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
