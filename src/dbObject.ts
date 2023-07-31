import { ObjectId } from "mongodb"
import { Mongo, typeIdentifier } from "./mongo"

export type SerializableObject = {
    [typeIdentifier]: string
    [key: string]: SerializableObject | any
}

export class DbObject {
    static dbIgnore: string[] = ["dbIgnore", "dbParent"];
    _id: ObjectId;

    public get dbType(): string {
        return this.constructor.name;
    }


    public set dbType(v: string) {
    }


    public get dbIgnore(): string[] {
        return (<typeof DbObject>this.constructor).dbIgnore;
    }

    static async find(filter: Record<string, any>): Promise<any> {
        return Mongo.find(filter, this.name)
    }

    static async set(obj: DbObject) {
        return await Mongo.set(obj.serialisable());
    }

    async update() {
        return await Mongo.set(this.serialisable());
    }

    serialisable(): any {
        const result = { dbType: this.dbType };
        for (const key in this) {
            if (this.dbIgnore.includes(key)) continue;
            result[key as string] = this[key];
        }
        return result;
    }

    static fromData(data: Partial<DbObject>){
        const newObject = new this();
        Object.assign(newObject, data);
        return newObject;
    }
}
