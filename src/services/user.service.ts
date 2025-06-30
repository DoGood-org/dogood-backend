import { prisma } from "@/lib/prisma";

export const getUserById = async (id: number) => {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            settings: true,
        },
    });
};


export const updateUserById = async (
    id: number,
    data: Partial<{ name: string; avatar: string; settings: { theme?: string; language?: string } }>
) => {
    return prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            settings: true,
        },
    });
};
