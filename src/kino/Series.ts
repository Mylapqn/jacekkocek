import { DbObject } from "../dbObject";

//Not implemented yet
export class Series extends DbObject {
    suggestedBy: string;
    watched = false;
    name: string;
    totalEpisodes = 12;
    currentEpisode = 0;
    totalSeries = 1;
    currentSeries = 1;
    static async fromCommand(name: string, suggestedBy: string) {
        let series = await Series.fromData({ name, suggestedBy });
        await series.dbUpdate();
        return series;
    }

    static override async fromData(data: Partial<Series>): Promise<Series> {
        const newObj = (await super.fromData(data)) as Series;
        Object.assign(newObj, data);
        return newObj;
    }

    static async get(name: string) {
        const seriesData = await Series.dbFind({ name });
        if (!seriesData) return undefined;
        return await this.fromData(seriesData);
    }
}
