const express = require('express');
const userRoute = express.Router();
const { getUserById, createUser, updateUserLastSeen, getUserChats } = require('../controllers/userController');

userRoute.get('/user/:userId', getUserById);
userRoute.get('/user-prisma/:userId', getUserById);
userRoute.get('/user/get-user-chats/:userId', getUserChats);
userRoute.post('/user/create', createUser);
userRoute.post('/user/online/:id', updateUserLastSeen);

module.exports = userRoute;