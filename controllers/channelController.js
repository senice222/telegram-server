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

const joinChannel = async (req, res) => {
    const { profileId, channelId } = req.query
    try {
        await prisma.channel.update({
            where: {
                id: channelId,
            },
            data: {
                members: {
                    create: { profileId: profileId },
                }
            },
        });
        res.status(200).json({ message: 'successfull join in channel' });
    } catch (e) {
        console.error('Ошибка при вступлении в канал:', e);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}

const getChannelById = async (req, res) => {
    const { channelId } = req.params;

    try {
        const channel = await prisma.channel.findUnique({
            where: {
                id: channelId,
            },
            include: {
                members: true,
                messages: true,
                owner: true,
            }
        });
        res.status(200).json(channel);
    } catch (error) {
        console.error('Ошибка при получении канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}

module.exports = { createChannel, searchChannels, getChannelById, joinChannel };
