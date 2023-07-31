import { DbObject, TopLevelDbObject } from "./dbObject";
import { Mongo, typeIdentifier } from "./mongo";
import { Wallet } from "./wallet";

export class User extends TopLevelDbObject {
    id: string;
    wallet?: Wallet;

    static async get(id: string): Promise<User> {
        const result = await User.find<User>({ id });

        if (result != null) {
            return result;
        }

        const newUser = new User();
        newUser.id = id;
        User.set(newUser);

        return newUser;
    }
}


