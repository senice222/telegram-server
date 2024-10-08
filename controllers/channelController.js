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

const sendMessage = async (req, res) => {
    const { profileId, channelId } = req.query;
    const { content } = req.body;
    // const file = req.file.filename

    if (!content) {
        return res.status(400).json({ message: "Content missing" });
    }

    try {
        const currentUser = await prisma.profile.findUnique({
            where: {
                id: profileId
            }
        })

        if (!currentUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const channelExists = await prisma.channel.findUnique({
            where: { id: channelId }
        });

        if (!channelExists) {
            return res.status(404).json({ error: "Channel not found" });
        }
        const isCurrentUserOwner = currentUser.id === channelExists.ownerId;
        if (!isCurrentUserOwner) {
            return res.status(403).json({ error: "You are not the owner of this channel" });
        }

        const newMessage = await prisma.message.create({
            data: {
                content,
                fileUrl: "123",
                channelId
            }
        });

        res.status(200).json(newMessage);
    } catch (error) {
        console.error("Error while sending message:", error);
        res.status(500).json({ error: "Server error while sending message" });
    }
};

const getChannelMessages = async (req, res) => {
    try {
        const MESSAGE_BATCH = 10
        const { cursor, channelId } = req.query;
        if (!channelId) {
            return res.status(400).json({ message: 'Channel ID missing' });
        }

        let messages = [];

        if (cursor) {
            messages = await prisma.message.findMany({
                take: MESSAGE_BATCH,
                skip: 1, // skip cursor message
                cursor: {
                    id: cursor,
                },
                where: {
                    channelId,
                },
                include: {
                    channel: {
                        include: {
                            members: {
                                include: {
                                    profile: true,  // Вложенное включение профиля через members
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } else {
            messages = await prisma.message.findMany({
                take: MESSAGE_BATCH,
                where: {
                    channelId,
                },
                include: {
                    channel: {
                        include: {
                            members: {
                                include: {
                                    profile: true,  // Вложенное включение профиля через members
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }

        let nextCursor = null;

        if (messages.length === MESSAGE_BATCH) {
            nextCursor = messages[MESSAGE_BATCH - 1].id;
        }
        return res.status(200).json({
            items: messages,
            nextCursor,
        });
    } catch (error) {
        console.error('MESSAGE_ERROR', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = { createChannel, searchChannels, getChannelById, joinChannel, sendMessage, getChannelMessages };
