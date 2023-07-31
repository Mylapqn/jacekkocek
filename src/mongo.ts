import { Collection, Db, MongoClient } from 'mongodb';
import { User } from "./user"
import { Wallet } from './wallet';
import { DbObject, SerializableObject, TopLevelDbObject, TopLevelSerializableObject } from './dbObject';
import { Film } from './film';
//import { Film } from './kino';

export const typeIdentifier = "dbType";

type ClassType = { new(...args: any[]): DbObject | TopLevelDbObject, name: string }

const mongourl = process.env.MONGO_URL ?? "mongodb://10.200.140.14:27017";

export class Mongo {
    private static db: Db;
    private static collections: Record<string, Collection> = {}

    private static registeredTypes = new Map<string, ClassType>();

    static async connect() {

        //Mongo.registerType(Film);
        const client = new MongoClient(mongourl);
        await client.connect();
        console.log('Connected successfully to mongo');
        this.db = client.db("jacekkocek");


        Mongo.registerType(User);
        Mongo.registerType(Wallet);
        Mongo.registerType(Film);
        Mongo.registerType(WalletStorage);
    }

    static async find(filter: Record<string, any>, collection: string) {
        console.log(await this.collections[collection].findOne(filter));
        
        return await this.collections[collection].findOne(filter) as unknown as TopLevelSerializableObject;
    }

    static async set(obj: TopLevelDbObject) {
        if (obj._id) {
            this.collections[obj.dbType].replaceOne({ _id: obj._id }, obj.serialisable(), { upsert: true });
        } else {
            this.collections[obj.dbType].insertOne(obj.serialisable());
        }
    }

    static registerType(classType: ClassType) {
        if ("isTopLevel" in classType) {

            this.collections[classType.name] = this.db.collection(classType.name);
        }
        this.registeredTypes.set(classType.name, classType);
    }

    static remove(obj: TopLevelDbObject) {
        this.collections[obj.dbType].deleteOne();
    }


    static parseTopLevelObject<T>(obj: TopLevelSerializableObject) {
        const classType = this.registeredTypes.get(obj[typeIdentifier]);

        const newObject = new classType() as TopLevelDbObject;
        delete obj[typeIdentifier];
        Object.assign(newObject, obj);

        for (const key in obj) {
            const serializable = obj[key];
            if (Mongo.isSerializableObject(serializable)) {
                newObject[key] = this.parseSerializable(serializable, newObject);
            }
        }

        return newObject as T
    }

    static parseSerializable(obj: SerializableObject, topLevelObject: TopLevelDbObject) {
        const classType = this.registeredTypes.get(obj[typeIdentifier]);

        const newObject = new classType();
        delete obj[typeIdentifier];
        Object.assign(newObject, obj);

        for (const key in obj) {
            const serializable = obj[key];
            if (typeof serializable == 'object' && "length" in serializable) {
                for (let index = 0; index < serializable.length; index++) {
                    const element = serializable[index];
                    if (Mongo.isSerializableObject(element)) {
                        serializable[index] = this.parseSerializable(serializable, topLevelObject);
                    }
                }
            } else if (Mongo.isSerializableObject(serializable)) {
                newObject[key] = this.parseSerializable(serializable, topLevelObject);
            }
        }

        newObject.dbParent = topLevelObject;

        return newObject
    }

    private static isSerializableObject(obj: any): obj is SerializableObject {
        return (typeof obj == 'object' && typeIdentifier in obj)
    }
}



class WalletStorage extends TopLevelDbObject {
    wallets = new Array<Wallet>;
    name: string;
}


async function test() {
    await Mongo.connect();

    let u = await User.get("pocek");
    if (!u.wallet) u.wallet = new Wallet();
    console.log(u);
    u.wallet.matoshi += 5;
    u.wallet.printMatoshi();
    u.update();


    //Film.fromCommand("Barbie", "Mylapqn");


}
test();
