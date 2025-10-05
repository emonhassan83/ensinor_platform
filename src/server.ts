import { createServer, Server } from 'http';
import app from './app';
import config from './app/config';
import initializeSocketIO from './socket';
import { seeder } from './app/seeder/seed';
import { scheduleExpiredUserCleanup } from './app/utils/cleanupExpiredUsers';
import { newsletterScheduleCorn } from './app/modules/newsletter/newsletter.utils';
let server: Server;
export const io = initializeSocketIO(createServer(app));

const main = async () => {
  try {
    // default task added
    seeder.seedAdmin();
    seeder.seedContents();
    scheduleExpiredUserCleanup();
    newsletterScheduleCorn();

    server = app.listen(Number(config.port), config.ip as string, () => {
      console.log(
        `⚡️[server]: Server is running at http://${config.ip}:${config.port}`,
      );
    });

    io.listen(Number(config.socket_port));
    console.log(
      `⚡️[socket]: Socket is running at http://${config.ip}:${config.socket_port}`,
    );
    // @ts-ignore
    global.socketio = io;
  } catch (error) {
    console.log(error);
  }
};

main();

process.on('unhandledRejection', error => {
  console.log(error);
  console.log('unhandledRejection detected server shutting down 😈');

  if (server) {
    server.close(() => process.exit(1));
  }
  process.exit(1);
});

process.on('uncaughtException', error => {
  console.log(error);
  console.log('uncaughtException detected server shutting down 😈');
  process.exit(1);
});
