const express = require('express');
const userRoute = express.Router();
const { getUserById, createUser } = require('../controllers/userController');

userRoute.get('/user/:userId', getUserById);
userRoute.post('/user/create', createUser);

module.exports = userRoute;
