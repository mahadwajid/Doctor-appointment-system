// Get Socket URL dynamically based on current hostname
export const getSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (envUrl && (!envUrl.includes('localhost') || isLocalHost)) {
      return envUrl;
    }

    return `http://${hostname}:5000`;
  }

  return envUrl || 'http://localhost:5000';
};

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
    socket = io(getSocketUrl(), {
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

