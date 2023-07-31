import { DbObject } from "./dbObject";
import { Mongo, typeIdentifier } from "./mongo";

export class Wallet extends DbObject {

    matoshi: number = 0;
    private stocks: Record<string, number> = {};
    printMatoshi() {
        console.log(this.matoshi);
    }

    static override fromData(data: Partial<Wallet>): Wallet {
        const newObj = super.fromData(data);
        Object.assign(newObj, data);
        return newObj as Wallet
    } 
}