import { DbObject } from "./dbObject";
import { Mongo,  typeIdentifier } from "./mongo";

export class Wallet extends DbObject{
    matoshi: number = 0;
    private stocks: Record<string, number> = {};
    printMatoshi(){
        console.log(this.matoshi);
    }
}