import { ObjectId } from "mongodb"
import { Mongo, typeIdentifier } from "./mongo"

export type SerializableObject = {
    [typeIdentifier]: string
    [key: string]: SerializableObject | any
}

export type TopLevelSerializableObject = {
    _id: string | number
} & SerializableObject

export class DbObject {
    static dbIgnore: string[] = ["dbIgnore", "dbParent"];
    dbParent: TopLevelDbObject
    _id: ObjectId;

    public get dbType(): string {
        console.log("ident", this.constructor.name)
        return this.constructor.name;
    }

    public get dbIgnore(): string[] {
        return (<typeof DbObject>this.constructor).dbIgnore;
    }

    serialisable(): SerializableObject {
        const result = { [typeIdentifier]: this[typeIdentifier], _id: this._id };
        for (const key in this) {
            if (this.dbIgnore.includes(key)) continue;
            if (this[key] instanceof DbObject) {
                result[key as string] = this[key as string].serialisable();
            } else {
                result[key as string] = this[key];
            }
        }
        return result;
    }
}


export class TopLevelDbObject extends DbObject {
    static isTopLevel = true;

    static async find<T extends TopLevelDbObject>(filter: Record<string, any>): Promise<T | null> {
        const res = await (Mongo.find(filter, this.name));
        if (!res) return null;
        return Mongo.parseTopLevelObject(res);
    }

    static async set(obj: TopLevelDbObject) {
        return await Mongo.set(obj);
    }

    async update() {
        return await Mongo.set(this);
    }
}


