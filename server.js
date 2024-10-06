const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const channelRouter = require('./routes/channelRoutes');
const userRoute = require('./routes/userRoutes');
const cors = require('cors')
const path = require('path');

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

app.use('/api', channelRouter);
app.use('/api', userRoute);
const dirname = path.resolve();
app.use('/api/uploads', express.static(path.join(dirname, '/uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
