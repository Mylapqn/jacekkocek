import { DbObject } from "./dbObject";

export class User extends DbObject {
    id: string;
    wallet?: Wallet;

    static async get(id: string, wallet = false): Promise<User> {
        const result = (await User.dbFind({ id })) as User;

        if (result != null) {
            if (result.wallet) {
                result.wallet = await Wallet.fromData(result.wallet);
            } else if (wallet) {
                result.wallet = new Wallet();
            }
            return this.fromData(result);
        }

        const newUser = new User();
        newUser.id = id;
        if (wallet) {
            newUser.wallet = new Wallet();
        }
        User.dbSet(newUser);
        return newUser;
    }

    static override async fromData(data?: Partial<User>) {
        const newObject = await super.fromData(data) as User;
        Object.assign(newObject, data);
        return newObject;
    }
}

export class Wallet extends DbObject {
    getStock(stock: string) {
        throw new Error("Method not implemented.");
    }
    setStock(stock: string, currentStock: any) {
        throw new Error("Method not implemented.");
    }
    matoshi: number = 0;
    stocks: Record<string, number> = {};
    printMatoshi() {
        console.log(this.matoshi);
    }

    static override async fromData(data: Partial<Wallet>): Promise<Wallet> {
        const newObj = await super.fromData(data) as Wallet;
        Object.assign(newObj, data);
        return newObj;
    }
}
