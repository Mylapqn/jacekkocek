import { Mongo, typeIdentifier } from "./mongo";
import { DbObject } from "./dbObject";


export class Film extends DbObject {
    suggestedBy: string;
    watched = false;
    name: string;

    static fromCommand(name: string, suggestedBy: string) {
        let film = Film.fromData({ name, suggestedBy });
        film.update();
        return film;
    }


    static override fromData(data: Partial<Film>): Film {
        const newObj = super.fromData(data);
        Object.assign(newObj, data);
        return newObj as Film
    }
}