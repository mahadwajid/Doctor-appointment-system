const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let ioModule = null;

export const getSocket = async () => {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }

  if (!socket) {
    if (!ioModule) {
      // Dynamic import for client-side only
      ioModule = await import('socket.io-client');
    }
    const io = ioModule.default || ioModule.io || ioModule;
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

