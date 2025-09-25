export interface RegisterRequest {
    fullnames : string
    username : string
    email : string
    password : string
    role : Role
}

export type Role = 'ADMIN' | 'USER'