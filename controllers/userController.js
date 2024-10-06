const { prisma } = require('../lib/prisma');

const createUser = async (req, res) => {
    const { userBody } = req.body;

    try {
        const existingProfile = await prisma.profile.findUnique({
            where: { userId: userBody.id },
        });

        if (existingProfile) {
            return res.status(400).json({message: "user already exists"});
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
        });
        res.status(200).json(profile);
    } catch (error) {
        console.error('Ошибка при создании канала:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = {
    getUserById,
    createUser
};