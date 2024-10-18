const { prisma } = require('../lib/prisma');

const createUser = async (req, res) => {
    const { userBody } = req.body;

    try {
        const existingProfile = await prisma.profile.findUnique({
            where: { userId: userBody.id },
        });

        if (existingProfile) {
            return res.status(400).json({ message: "user already exists" });
        }
        const newProfile = await prisma.profile.create({
            data: {
                userId: userBody.id,
                name: userBody.name,
                imageUrl: userBody.imageUrl,
                email: userBody.email,
            },
        });

        return res.status(200).json(newProfile);
    } catch (e) {
        console.log("error during creating profile:", e)
    }
}

const getUserById = async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await prisma.profile.findUnique({
            where: {
                userId,
            },
            include: {
                channels: { // включение каналов
                    include: {
                        channel: { // включение каналов
                            include: {
                                members: { // получение мемберов
                                    include: {
                                        profile: true, // для получения информации о каждом участнике
                                    },
                                },
                            },
                        },
                    },
                },
                conversationsInitiated: {
                    include: {
                        memberOne: true,
                        memberTwo: true
                    }
                },
                conversationsReceived: {
                    include: {
                        memberOne: true,
                        memberTwo: true
                    }
                },
                ownedChannels: true
            }
        });
        res.status(200).json(profile);
    } catch (error) {
        console.error('Ошибка при создании канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const getUserByPrismaId = async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await prisma.profile.findUnique({
            where: {
                id: userId,
            },
            include: {
                channels: { // включение каналов
                    include: {
                        channel: { // включение каналов
                            include: {
                                members: { // получение мемберов
                                    include: {
                                        profile: true, // для получения информации о каждом участнике
                                    },
                                },
                            },
                        },
                    },
                },
                ownedChannels: true
            }
        });
        res.status(200).json(profile);
    } catch (error) {
        console.error('Ошибка при создании канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const updateUserLastSeen = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.profile.update({
            where: { id },
            data: { lastSeen: new Date() }
        });
        res.status(200).json({ message: "last seen updated" });
    } catch (e) {
        console.log("error during updating last seen:", e)
        res.status(500).json({ message: "error updating last seen" });
    }

};

const getUserChats = async (req, res) => {
    const { userId } = req.params;

    try {
        const channels = await prisma.channel.findMany({
            where: { members: { some: { profileId: userId } } },
            include: {
                members: {
                    include: {
                        profile: true, 
                    },
                },
                messages: true,
                owner: true, 
            },
        });

        const groups = await prisma.group.findMany({
            where: { members: { some: { memberId: userId } } },
            include: {
                members: {
                    include: {
                        profile: true, 
                    },
                },
                messages: true, 
                owner: true, 
            },
        });

        const conversations = await prisma.conversation.findMany({
            where: {
                OR: [
                    { memberOneId: userId },
                    { memberTwoId: userId },
                ],
            },
            include: {
                memberOne: true,
                memberTwo: true,
                directMessages: true, 
            },
        });
        const allChats = [...channels, ...groups, ...conversations];

        res.status(200).json(allChats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chats', error });
    }
};


module.exports = {
    getUserById,
    createUser,
    updateUserLastSeen,
    getUserByPrismaId,
    getUserChats
};