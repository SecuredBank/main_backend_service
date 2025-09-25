import { PrismaClient } from "../../generated/prisma";

const globalPrisma = global as unknown as { prisma : PrismaClient }

export const client = globalPrisma.prisma || new PrismaClient({
    log : ["query", "error", "warn", "info"]
});

if(process.env.NODE_ENV !== 'production') {
     globalPrisma.prisma = client
}

