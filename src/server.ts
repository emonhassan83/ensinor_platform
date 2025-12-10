import { createServer, Server } from 'http';
import app from './app';
import config from './app/config';
import initializeSocketIO from './socket';
import { seeder } from './app/seeder/seed';
import { initializeCleanupJobs } from './app/utils/initializeCleanupJobs';
import { newsletterScheduleCorn } from './app/modules/newsletter/newsletter.utils';
let server: Server;
export const io = initializeSocketIO(createServer(app));
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.IP || '0.0.0.0';
import colors from 'colors';

const main = async () => {
  try {
    // default task added
    seeder.seedAdmin();
    seeder.seedContents();
    seeder.seedInitialChats();
    initializeCleanupJobs();
    newsletterScheduleCorn();

    server = app.listen(PORT, HOST, () => {
     console.log(
        colors.italic.green.bold(
          `💫 Simple Server Listening on  http://${config?.ip}:${config.port} `,
        ),
      );
    })

    io.listen(Number(config.socket_port))
    console.log(
      colors.yellow.bold(
        `⚡Socket.io running on  http://${config.ip}:${config.socket_port}`,
      ),
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
