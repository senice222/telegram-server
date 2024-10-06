const path = require('path');
const { prisma } = require('../lib/prisma');

const createChannel = async (req, res) => {
    const { name, description, ownerId } = req.body;


    try {
        const channel = await prisma.channel.create({
            data: {
                name,
                description,
                image: req.file.filename,
                owner: {
                    connect: { id: ownerId }, 
                },
                members: {
                    create: { profileId: ownerId }, 
                },
            },
        });
        res.status(201).json(channel); 
    } catch (error) {
        console.error('Ошибка при создании канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const searchChannels = async (req, res) => {
    const query = req.query.q;

    try {
        const channels = await prisma.channel.findMany({
            where: {
                name: {
                    contains: query,
                },
            },
            take: 10,
        });

        const users = await prisma.profile.findMany({
            where: {
                name: {
                    contains: query,
                },
            },
            take: 10,
        });

        res.json([...channels, ...users]);
    } catch (error) {
        console.error('Ошибка при поиске:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}

module.exports = { createChannel, searchChannels };
