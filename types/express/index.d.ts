import { JwtPayload } from 'jsonwebtoken';

declare namespace Express {
    export interface Request {
        user ?: {
            userId : string,
            role : string
        };
    }
}

declare global {
    namespace Express{
        interface Request {
            user ?: {
                id : string,
                role : string
            };
        }
    }
}