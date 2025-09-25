import express from 'express';
import { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { client } from './config/db';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Basic health check route
app.get('/', (req: Request, res: Response) => {
    res.send("NodeTS server running");
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if(client) {
        console.log("Connected to Supabase successfully")
    } else {
        console.log("Error connecting to Supabase DB")
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        if(client) {
            client.$disconnect()
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
