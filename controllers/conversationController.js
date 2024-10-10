const { prisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const createConversationIfNotExists = async (req, res) => {
    const {memberOneId, memberTwoId} = req.query
    if (!memberOneId || !memberTwoId) {
        throw new Error("IDs not found");
    }

    try {
        let conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { memberOneId, memberTwoId },
                    { memberOneId: memberTwoId, memberTwoId: memberOneId }
                ]
            }
        });

        if (!conversation) {
            const idWithMinus = `-${uuidv4()}`;
            conversation = await prisma.conversation.create({
                data: {
                    id: idWithMinus,
                    memberOne: {
                        connect: {id: memberOneId},
                    },
                    memberTwo: {
                        connect: {id: memberTwoId},
                    },
                }
            });
        }

        res.status(200).json(conversation)
    } catch (error) {
        console.error("Error finding or creating conversation:", error);
        res.status(500).json({ error: "Failed to create conversation" });
    }
};

const getConversation = async (req, res) => {
    const {memberOneId, memberTwoId} = req.query
    try {
        let conversation = await prisma.conversation.findFirst({
            where: {
                OR: [
                    { memberOneId, memberTwoId },
                    { memberOneId: memberTwoId, memberTwoId: memberOneId }
                ]
            },
            include: {
                memberOne: true,
                memberTwo: true
            }
        });
        res.status(200).json(conversation)
    } catch (e) {
        console.log(e, "error during getting conv")
    }
}

const getConversationById = async (req, res) => {
    const {id} = req.params
    try {
        let conversation = await prisma.conversation.findFirst({
            where: {
                id
            },
            include: {
                memberOne: true,
                memberTwo: true
            }
        });
        res.status(200).json(conversation)
    } catch (e) {
        console.log(e, "error during getting conv")
    }
}

const sendMessageInConversation = async (req, res) => {
    const { conversationId } = req.query;
    const { content, fileUrl, memberId } = req.body;

    if (!conversationId) {
        return res.status(400).json({ error: "Conversation ID is required" });
    }

    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const message = await prisma.directMessage.create({
            data: {
                content,
                fileUrl,
                memberId,
                conversationId: conversation.id,
            }
        });

        res.status(200).json({ message: "Message sent", message });
    } catch (error) {
        console.log(error, "Error sending message");
        res.status(500).json({ error: "Failed to send message" });
    }
};

module.exports = {createConversationIfNotExists, sendMessageInConversation, getConversation, getConversationById}