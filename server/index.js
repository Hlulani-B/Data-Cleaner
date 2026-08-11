import express from 'express';
import csvRoute from './Routes/Convert.js';

const app = express();

app.use(express.json());
app.use('/api', csvRoute);

app.listen(3000, () => console.log('Server running on port 3000'));