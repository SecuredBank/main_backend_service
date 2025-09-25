import { User } from "../../generated/prisma";
import { client } from "../config/db";
import bcrypt from 'bcryptjs'

export const registerService = async (fullnames : string, username : string, email : string, password : string) : Promise<{ message : string } | undefined> => {
    try {
        const existingUser = await client.user.findUnique({
            where : {
                email : email
            }
        })
        if(!existingUser) return { message : "User already exists" };
        const isPasswordValid = await validatePassword(existingUser, password);
        if(!isPasswordValid) return { message : "Invalid password" };
        const hashedPassword = await bcrypt.hash(password, 12)
        const user = await client.user.create({
            data : {
                fullnames : fullnames,
                email : email,
                username : username,
                password : hashedPassword
            }
        })
        if(user) {
            return { message : "User registered successfully" }
        }
    } catch (error : any) {
        throw new Error(error.message)        
    }
}

const validatePassword = async (user : User, password : string) : Promise<any> => {
    try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        return isPasswordValid
    } catch (error : any) {
        throw new Error(error.message)
    }
}