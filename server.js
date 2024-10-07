const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const channelRouter = require('./routes/channelRoutes');
const userRoute = require('./routes/userRoutes');
const cors = require('cors')
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  path: "/api/socket/io",
  transports: ["websocket", "polling"],
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

app.use('/api', channelRouter);
app.use('/api', userRoute);
const dirname = path.resolve();
app.use('/api/uploads', express.static(path.join(dirname, '/uploads')));

io.on('connection', (socket) => {
  console.log(socket)
  console.log('Клієнт підключився:', socket.id);

  socket.on('message', (msg) => {
    console.log('Отримано повідомлення:', msg);
    socket.broadcast.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('Клієнт відключився:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

