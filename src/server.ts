import express from 'express'; // @ts-ignore
import { type Request, type Response } from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response) => {
    res.send("NodeTS server running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
