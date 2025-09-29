const onlineUsers = new Map<string, Set<string>>(); 

export const userPresence = {
  add(userId: string, socketId: string) {
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socketId);
    return onlineUsers.get(userId)!.size === 1;
  },

  remove(userId: string, socketId: string) {
    const sockets = onlineUsers.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
      return true;
    }
    return false;
  },

  isOnline(userId: string) {
    return onlineUsers.has(userId);
  },

  getOnlineUsers() {
    return Array.from(onlineUsers.keys());
  },
};
