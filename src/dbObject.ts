import { Filter, FindOptions, ObjectId } from "mongodb";
import { Mongo, typeIdentifier } from "./mongo";

export type SerializableObject = {
    [typeIdentifier]: string;
    [key: string]: SerializableObject | any;
};


export class DbObject {
    static dbIgnore: string[] = ["dbIgnore", "dbParent"];
    _id: ObjectId;

    public get dbType(): string {
        return this.constructor.name;
    }

    public set dbType(v: string) {}

    public get dbIgnore(): string[] {
        return (<typeof DbObject>this.constructor).dbIgnore;
    }

    static async dbFind<T>(filter: Filter<T>): Promise<T> {
        return (await Mongo.find(filter, this.name)) as unknown as T;
    }

    static async dbDelete<T>(filter: Filter<T>): Promise<T> {
        return (await Mongo.delete(filter, this.name)) as unknown as T;
    }

    static async dbFindAll<T>(filter: Filter<T>, options?: FindOptions<T>): Promise<T[]> {
        return (await Mongo.findAll(filter, options, this.name)) as unknown as T[];
    }

    static async dbSet(obj: DbObject) {
        obj._id = await Mongo.set(obj.serialisable());
    }

    async dbUpdate() {
        this._id = await Mongo.set(this.serialisable());
    }

    async dbRefresh() {
        const data = (<typeof DbObject>this.constructor).dbFind({ _id: this._id });
        Object.assign(this, data);
    }

    serialisable(): any {
        const result = { dbType: this.dbType };
        for (const key in this) {
            if (this.dbIgnore.includes(key)) continue;
            result[key as string] = this[key];
        }
        return result;
    }

    static async fromData(data: Partial<DbObject>) {
        const newObject = new this();
        Object.assign(newObject, data);
        return newObject;
    }
}
