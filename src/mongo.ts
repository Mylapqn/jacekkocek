import { Collection, Db, Filter, FindOptions, MongoClient, ObjectId } from "mongodb";
import { DbObject, SerializableObject } from "./dbObject";
//import { Film } from './kino';

export const typeIdentifier = "dbType";

type ClassType = { new (...args: any[]): DbObject | DbObject; name: string };

const mongourl = process.env.MONGO_URL ?? "mongodb://10.200.140.14:27017";

export class Mongo {
    private static db: Db;
    private static collections: Record<string, Collection> = {};

    static async connect() {
        const client = new MongoClient(mongourl);
        await client.connect();
        console.log("Connected successfully to mongo");
        this.db = client.db("jacekkocek");

        Mongo.registerType("User");
        Mongo.registerType("Wallet");
        Mongo.registerType("Film");
        Mongo.registerType("Poll");
        Mongo.registerType("Event");
        Mongo.registerType("Policy");
    }

    static async find(filter: Filter<any>, collection: string) {
        return await this.collections[collection].findOne(filter);
    }

    static async findAll(filter: Filter<any>, options: FindOptions<any>, collection: string) {
        return await this.collections[collection].find(filter, options).toArray();
    }

    static async set(obj: DbObject) {
        if (obj._id) {
            await this.collections[obj.dbType].replaceOne({ _id: obj._id }, obj, { upsert: true });
            return obj._id;
        } else {
            const res = await this.collections[obj.dbType].insertOne(obj);
            return res.insertedId;
        }
    }

    static registerType(name: string) {
        this.collections[name] = this.db.collection(name);
    }

    static remove(obj: DbObject) {
        this.collections[obj.dbType].deleteOne();
    }
}