import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import routes from './app/routes';
import cookieParser from 'cookie-parser';
import notFound from './app/middlewares/notfound';
import archiver from 'archiver'
import axios from 'axios'
import prisma from './app/utils/prisma';
import sanitize from 'sanitize-filename';

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

// @ts-ignore
app.get('/api/v1/download/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findFirst({
      where: { id: orderId },
      include: {
        orderItem: {
          include: {
            book: true
          }
        }
      }
    });

    if (!order || !order.files || order.files.length === 0) {
      return res.status(404).send('No documents found for this order.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=order-${orderId}-ebooks.zip`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (let i = 0; i < order.files.length; i++) {
      const url = order.files[i];
      const bookTitle = order.orderItem[i]?.book?.title || `book_${i + 1}`;
      const safeTitle = sanitize(bookTitle); // Remove invalid filesystem chars

      try {
        const response = await axios.get(url, { responseType: 'stream' });

        // Force download as PDF with book title
        archive.append(response.data, { name: `${safeTitle}.pdf` });
      } catch (err: any) {
        console.warn(`Skipping file at ${url}: ${err.message}`);
      }
    }

    archive.on('error', err => {
      console.error('Archive error:', err);
      res.status(500).send('Error creating ZIP.');
    });

    await archive.finalize();
  } catch (err) {
    console.error('Error during download:', err);
    res.status(500).send('Something went wrong while downloading PDFs.');
  }
});

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
