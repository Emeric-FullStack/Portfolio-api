import "socket.io";

declare module "socket.io" {
  interface Socket {
    user?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      [key: string]: any;
    };
  }
}
