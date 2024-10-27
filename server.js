const express = require('express');

const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const WSServer = require('express-ws')(app);
const aWss = WSServer.getWss();

const channelRouter = require('./routes/channelRoutes')(aWss);
const userRoute = require('./routes/userRoutes');
const conversationRoute = require('./routes/conversationRoutes')(aWss);
const groupRoute = require('./routes/groupRoutes')(aWss);

dotenv.config();

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use('/api', channelRouter);
app.use('/api', userRoute);
app.use('/api', conversationRoute);
app.use('/api', groupRoute);

const dirname = path.resolve();
app.use('/api/uploads', express.static(path.join(dirname, '/uploads')));

app.ws('/api/socket/io', (socket) => {
  socket.on('message', (msg) => {
    try {
      const messageData = JSON.parse(msg);
      if (messageData.method === 'register') {
        socket.clientId = messageData.data.id;
        console.log(`Клиент зарегистрирован с clientId: ${socket.clientId}`);
      }
    } catch (error) {
      console.error("Ошибка при обработке сообщения:", error);
    }
  });

  socket.on('close', () => {
    console.log('Клиент отключился');
  });
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
