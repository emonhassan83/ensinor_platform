import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import routes from './app/routes';
import cookieParser from 'cookie-parser';
import notFound from './app/middlewares/notfound';

const app: Application = express();
app.use(express.static('public'));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// parsers
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);

// application routes
app.use('/api/v1', routes);
app.get('/', async (req: Request, res: Response) => {
  res.json({
    message: 'Ensinor server is running!',
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

//global error handler
app.use(globalErrorHandler);

//@ts-ignore
app.use(notFound);

export default app;
