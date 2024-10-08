const express = require('express');
const userRoute = express.Router();
const { getUserById, createUser, updateUserLastSeen } = require('../controllers/userController');

userRoute.get('/user/:userId', getUserById);
userRoute.post('/user/create', createUser);
userRoute.post('/user/online/:id', updateUserLastSeen);

module.exports = userRoute;
