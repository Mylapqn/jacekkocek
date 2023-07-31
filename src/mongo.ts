import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { User } from "./user"
import { Wallet } from './wallet';
import { DbObject, SerializableObject } from './dbObject';
import { Film } from './film';
import { Poll } from './polls';
//import { Film } from './kino';

export const typeIdentifier = "dbType";

type ClassType = { new(...args: any[]): DbObject | DbObject, name: string }

const mongourl = process.env.MONGO_URL ?? "mongodb://10.200.140.14:27017";

export class Mongo {
    private static db: Db;
    private static collections: Record<string, Collection> = {}

    static async connect() {

        //Mongo.registerType(Film);
        const client = new MongoClient(mongourl);
        await client.connect();
        console.log('Connected successfully to mongo');
        this.db = client.db("jacekkocek");


        Mongo.registerType(User);
        Mongo.registerType(Wallet);
        Mongo.registerType(Film);
        Mongo.registerType(Poll);
    }

    static async find(filter: Record<string, any>, collection: string) {
        return await this.collections[collection].findOne(filter);
    }

    static async set(obj: DbObject) {
        if (obj._id) {
            const res = await this.collections[obj.dbType].replaceOne({ _id: obj._id }, obj, { upsert: true });
            return res.upsertedId;
        } else {
            const res = await this.collections[obj.dbType].insertOne(obj);
            return res.insertedId;
        }
    }

    static registerType(classType: ClassType) {
        this.collections[classType.name] = this.db.collection(classType.name);
    }

    static remove(obj: DbObject) {
        this.collections[obj.dbType].deleteOne();
    }
}


async function test() {
    await Mongo.connect();
    const poll = Poll.fromData( await Poll.find({ _id: new ObjectId("64c80610b6b5183e3fafa715")}));
    //poll.addOption("lole");
    poll.addVote(0, "as");
}
test();
