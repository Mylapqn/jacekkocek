import { DbObject } from "./dbObject";
import { policyValues } from "./main";
import * as Utilities from "./utilities";

export class Policy extends DbObject {
    static override dbIgnore = [...super.dbIgnore, "parent", "children", "symbol", "description"];
    static categories = new Set<string>();
    static list = new Array<Policy>();
    name: string;
    symbol: string;
    value: number;
    category: string;
    description: string;
    parent: Policy;
    children: Policy[] = [];

    async loadValues() {
        const result = await Policy.dbFind({ category: this.category, name: this.name });
        Object.assign(this, result);
    }

    static async createOrLoad({ category, name, value, symbol, parent, description }: { category: string; name: string; value: number; symbol: string; parent?: Policy; description: string }) {
        const policy = new Policy();
        policy.name = name;
        policy.symbol = symbol;
        policy.category = category;
        policy.description = description;
        this.categories.add(category);
        policy.value = value;
        await policy.loadValues();
        policy.updateProxy();

        this.list.push(policy);
        if (parent) {
            policy.parent = parent;
            parent.children.push(policy);
        }
        return policy;
    }

    static generateHints(){
    }

    static generatePolicyList() {
        let list = "**__JacekKocek Policy List:__**\n";

        for (const category of this.categories) {
            list += "**" + Utilities.toTitleCase(category) + ":**\n";
            for (const policy of this.list) {
                if (policy.category != category) continue;
                const value = policy.value;
                if (!policy.parent || policy.parent.value != value) list += "• " + policy.description + ": **" + value + " " + policy.symbol + "**\n";
            }
        }
        return list;
    }

    static async setPolicyValue(category: string, name: string, value: number) {
        const policy = this.list.find((p) => p.category == category && p.name == name);
        if (policy) {
            await policy.setValue(value);
        } else {
            console.log(`there is no policy called ${name} in the ${category} category`);
        }
    }

    async setValue(value: number) {
        for (const child of this.children) {
            await child.setValue(value);
        }

        this.value = value;
        await this.dbUpdate();
        this.updateProxy();
    }

    updateProxy() {
        policyValues[this.category][this.name] = this.value;
    }


    static get(category: string, name?: string) {
        if (name == undefined) [category, name] = category.split(".");
        const policy = this.list.find((p) => p.category == category && p.name == name);
        if (policy) {
            return policy;
        } else {
            throw new Error(`there is no policy called ${name} in the ${category} category`);
        }
    }

    static async init() {
        await this.createOrLoad({
            category: "kino",
            name: "suggestReward",
            symbol: "₥",
            description: "Kino suggest reward",
            value: 50,
        });

        await this.createOrLoad({
            category: "kino",
            name: "watchReward",
            symbol: "₥",
            description: "Kino watch reward",
            value: 200,
        });

        await this.createOrLoad({
            category: "kino",
            name: "lateFee",
            symbol: "₥",
            description: "Kino late fee",
            value: 100,
        });

        await this.createOrLoad({
            category: "kino",
            name: "defaultTimeHrs",
            symbol: "hours",
            description: "Kino default time",
            value: 19,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "transactionFeePercent",
            symbol: "%",
            description: "Matoshi transaction fee percentage (Doesn't apply if below minimum fee)",
            value: 0,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "transactionFeeMin",
            symbol: "₥",
            description: "Matoshi minimum transaction fee",
            value: 1,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "weeklyTaxPercent",
            symbol: "%",
            description: "Weekly percent tax",
            value: 0,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "weeklyTaxFlat",
            symbol: "₥",
            description: "Weekly flat tax",
            value: 0,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "assignmentSupervisionReward",
            symbol: "₥",
            description: "Reward for supervising a task",
            value: 10,
        });

        await this.createOrLoad({
            category: "matoshi",
            name: "assignmentStreakKeep",
            symbol: "d",
            description: "Assignment streak keep",
            value: 14,
        });

        const serviceDefaultFee = await this.createOrLoad({
            category: "service",
            name: "defaultFee",
            symbol: "₥",
            description: "Service fee",
            value: 0,
        });

        await this.createOrLoad({
            category: "service",
            name: "searchFee",
            symbol: "₥",
            description: "Search fee",
            value: 1,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "service",
            name: "radioFee",
            symbol: "₥",
            description: "Radio fee",
            value: 0,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "service",
            name: "youtubeFee",
            symbol: "₥",
            description: "Youtube fee",
            value: 0,
        });

        await this.createOrLoad({
            category: "service",
            name: "fryPleaseFee",
            symbol: "₥",
            description: "Usmažit prosím fee",
            value: 0,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "service",
            name: "remindFee",
            symbol: "₥",
            description: "Remind fee",
            value: 0,
        });

        await this.createOrLoad({
            category: "service",
            name: "nukeFee",
            symbol: "₥",
            description: "Nuke fee",
            value: 0,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "service",
            name: "imageFee",
            symbol: "₥",
            description: "Image search fee",
            value: 20,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "service",
            name: "calcFee",
            symbol: "₥",
            description: "Kalkulačka fee",
            value: 0,
            parent: serviceDefaultFee
        });

        await this.createOrLoad({
            category: "stock",
            name: "defaultFee",
            symbol: "%",
            description: "Stock transaction fee",
            value: 0,
        });

        
        await this.createOrLoad({
            category: "stock",
            name: "saleLimit",
            symbol: "₥",
            description: "Daily stock sales limit",
            value: 1000,
        });

    }
}
