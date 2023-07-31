import { Mongo, typeIdentifier } from "./mongo";
import { TopLevelDbObject } from "./dbObject";


export class Film extends TopLevelDbObject {  
    suggestedBy: string;
    watched = false;
    name: string;
      
    constructor(name: string, suggestedBy: string) {
        super();
        this.name = name;
        this.suggestedBy = suggestedBy;
    }

    static fromCommand(name: string, suggestedBy: string) {
        let film = new Film(name, suggestedBy);
        film.update();
        return film;
    }
}