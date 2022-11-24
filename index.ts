import express, { request } from 'express';
import cors from 'cors'
import { createServer } from "http";
import { Server } from "socket.io";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import jwt, { TokenExpiredError } from 'jsonwebtoken'

const app: express.Application = express();
const httpServer = createServer(app);
const port: number = 5000;

// const corsOptions = {
//   exposedHeaders: 'WWW-Authenticate',
//   origin: "http://localhost:3000",
//   credentials: true,
// };
// app.use(cors(corsOptions))

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
  serverMessage: ({}: ServerMessage) => void
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface User {
  id: string;
  publicKey: string
  createdAt: Date
  updatedAt: Date
  userName: 'string'
  iat: number;
}

interface SocketData { 
  userName: string,
  badge: string
}

interface ServerMessage {
  type: string
  userName: string,
  message: string,
  badge: string
}

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: "https://satsgg.up.railway.app/",
    credentials: true
  }
});

const chat = io.of("/chat");

chat.use(async (socket, next) => {
    const token = socket.handshake.auth.token ?? undefined
    const nym: any | undefined = socket.handshake.query.nym ?? undefined

    if (token && jwt.verify(token, process.env.JWT_TOKEN ?? '')) {
      const user: User = token ? jwt.verify(token, process.env.JWT_TOKEN ?? '') : token
      socket.data.userName = user.userName
      socket.data.badge = 'lnauth'
    } else if (nym) {
      socket.data.userName = nym
      socket.data.badge = 'nym'
    } else {
      console.log('ERROR NOT USER OR NYM')
    }

    next()
});

chat.on("connection", (socket: any) => {
  socket.join(socket.handshake.query.room);
  socket.emit('serverMessage', {
    type: 'serverMessage', 
    userName: undefined,
    message: 'Welcome to the chat!',
    badge: undefined
  })

  socket.on('clientMessage', (clientMessage: string) => {
    return chat.to(socket.handshake.query.room).emit('serverMessage', { 
      type: 'userMessage', 
      userName: socket.data.userName, 
      message: clientMessage,
      badge: socket.data.badge
    });
  })
})

httpServer.listen(port, () => {
  console.log(`TypeScript with Express http://localhost:${port}/`);
})