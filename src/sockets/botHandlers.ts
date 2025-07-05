import { Socket, Server } from 'socket.io';
// import {OPENAI_API_KEY } from '@/config/env';

export default function botHandlers(io: Server, socket: Socket) {
  socket.on('messageToBot', async (message: string) => {
    // console.log(`User ${socket.id} says: ${message}`);

    // Можна тут викликати OpenAI чи інший сервіс
    const botReply = `Бот відповідає на: "${message}"`;

    socket.emit('botReply', botReply);
  });
}
