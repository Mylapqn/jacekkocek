import { DbObject } from "./dbObject";
import { Mongo, typeIdentifier } from "./mongo";
import { Wallet } from "./wallet";

export class User extends DbObject {
    id: string;
    wallet?: Wallet;


    static async get(id: string): Promise<User> {
        const result = await User.find({ id }) as User;

        if (result != null) {
            if (result.wallet) result.wallet = Wallet.fromData(result.wallet);
            return this.fromData(result);
        }

        const newUser = new User();
        newUser.id = id;
        User.set(newUser);

        return newUser;
    }

    static override fromData(data?: Partial<User>){
        const newObject = super.fromData(data);
        Object.assign(newObject, data);
        return newObject as User
    }
}


