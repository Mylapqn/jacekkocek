import * as Mathoshi from "./matoshi";
import * as Main from "./main";
import { DbObject } from "./dbObject";
import { shuffle } from "./utilities";

enum Currency {
    matoshi = "₥",
    science = "⚗️",
    intel = "🕵️",
}

type Bid = {
    player?: string;
    bid: number;
    item: EnhancableItem;
    currency: Currency;
};

enum ItemType {
    shipCore = 0,
    armorPlating = 1,
    sensorArray = 2,
    sonar = 3,
    crewQuarters = 4,
    medbay = 5,
    armory = 6,
    fighterBay = 7,
    ionThruster = 8,
    plasmaThruster = 9,
    laserCannon = 10,
    plasmaCannon = 11,
    missileLauncher = 12,
    fordwardShield = 13,
    pointDefence = 14,
    mobileLab = 15,
    researchLab = 16,
    surveillancePost = 17,
    ionCannon = 18,
    ionTurret = 19,
    ammoCrate = 20,
    addScience = 21,
    removeScience = 22,
    addIntel = 23,
    removeIntel = 24,
    cameraArray = 25,
}

const commonPool: Array<ItemType> = [
    ItemType.shipCore,
    ItemType.sensorArray,
    ItemType.sonar,
    ItemType.crewQuarters,
    ItemType.armory,
    ItemType.fighterBay,
    ItemType.ionThruster,
    ItemType.plasmaThruster,
    ItemType.laserCannon,
    ItemType.plasmaCannon,
    ItemType.missileLauncher,
    ItemType.fordwardShield,
    ItemType.pointDefence,
    ItemType.mobileLab,
    ItemType.researchLab,
    ItemType.surveillancePost,
    ItemType.cameraArray,
    ItemType.ionCannon,
    ItemType.ionTurret,
    ItemType.ammoCrate,
];

const rarePool: Array<ItemType> = [ItemType.addScience, ItemType.removeScience, ItemType.addIntel, ItemType.removeIntel];

const sciencePool: Array<ItemType> = [ItemType.medbay, ItemType.ammoCrate, ItemType.removeScience, ItemType.addIntel];

const intelPool: Array<ItemType> = [ItemType.ammoCrate, ItemType.removeIntel, ItemType.addScience, ItemType.armorPlating];

enum Alterable {
    power = "power",
    defence = "defence",
    speed = "speed",
    sensors = "sensors",
    crew = "crew",
    teamDefence = "teamDefence",
    ammo = "ammo",
    electionIntel = "electionIntel",
    electionScience = "electionScience",
    intelSlots = "intelSlots",
    scienceSlots = "scienceSlots",
}

const bonusPool = [Alterable.crew, Alterable.speed, Alterable.sensors, Alterable.power];

export class Game extends DbObject {
    static current: Game;
    static async load() {
        const gameData = (await this.dbFindAll({})) as Game[];
        if (gameData.length > 0) {
            this.current = await Game.fromData(gameData[0]);
        } else {
            this.current = new Game();
        }
        this.current.checkReady();
    }

    getPlayer(id: string) {
        return this.players.find((p) => p.id == id);
    }

    newContentCounter = 0;

    createShip(id: string) {
        if (this.players.find((p) => p.id == id)) return "You already have a ship!";
        const player = new Player();
        player.id = id;
        player.game = this;
        this.players.push(player);
        player.items.push(this.enhanceItem(ItemType.shipCore));
        player.items.push(this.enhanceItem(ItemType.laserCannon));
        player.items.push(this.enhanceItem(ItemType.laserCannon));
        player.items.push(this.enhanceItem(ItemType.armorPlating));
        player.addToStowage(this.enhanceItem(ItemType.surveillancePost));
        player.addToStowage(this.enhanceItem(ItemType.researchLab));
        player.addToStowage(this.enhanceItem(ItemType.ionTurret));
        return `<@${id}> ` + "Ship created!";
    }

    enhanceItem(itemtype: ItemType): EnhancableItem {
        return {
            item: itemtype,
            bonus: {
                value: 1,
                alterable: pickRandom(bonusPool),
            },
        };
    }

    public get dbIgnore(): string[] {
        return ["activePlayers", "players"];
    }

    override serialisable() {
        const data = super.serialisable();
        data.activePlayers = this.activePlayers.map((p) => p.id);
        data.players = this.players.map((p) => p.serialisable());
        return data;
    }

    static override async fromData(data: Partial<Game>): Promise<Game> {
        const newObject = (await super.fromData(data)) as Game;
        Object.assign(newObject, data);

        newObject.players = [];
        for (const player of data.players) {
            const newPlayer = new Player();
            Object.assign(newPlayer, player);
            newPlayer.game = newObject;
            newObject.players.push(newPlayer);
        }

        newObject.activePlayers = [];

        for (const player of data.activePlayers as unknown as string[]) {
            newObject.activePlayers.push(newObject.players.find((p) => p.id === player));
        }

        return newObject;
    }

    matoshiPool = 0;
    players = new Array<Player>();
    activePlayers = new Array<Player>();
    difficulty = 10;
    scienceSlots = 1;
    intelSlots = 1;
    availableScience = 20;
    availableIntel = 20;
    teamDefence = 0;
    damage = 0;

    store: Array<Bid>;

    ready = false;

    checkReady() {
        if (this.ready) {
            this.schedule();
            return;
        }
        if (!this.ready) {
            this.ready = true;
            this.generate();
            this.schedule();
        }
    }

    schedule() {
        //schedule the next tick
        //tick should happen every day at 7:00 and 16:00
        const now = new Date();
        const nextTick = new Date();
        if (now.getHours() < 7) {
            nextTick.setHours(7);
        } else if (now.getHours() < 16) {
            nextTick.setHours(16);
        } else {
            nextTick.setDate(now.getDate() + 1);
            nextTick.setHours(7);
        }

        nextTick.setMinutes(0);
        nextTick.setSeconds(0);
        nextTick.setMilliseconds(0);

        setTimeout(() => this.tick(), nextTick.getTime() - now.getTime());
        console.log(`Next tick at ${nextTick}`);
    }

    async tick() {
        if (this.activePlayers.length != 0) {
            this.processItems();
            this.awardResources();
            this.blueOnBlue();
            this.dealDamage();
            await this.award();
            this.cleanup();
        } else {
            this.report("No players joined, skipping.");
        }
        this.giveBids();
        this.generate();
        this.schedule();
    }

    giveBids() {
        for (const bid of this.store) {
            if (bid.player) {
                const player = this.getPlayer(bid.player);
                player.addToStowage(bid.item);
            }
        }
    }

    dealDamage() {
        const damage = this.damage - this.teamDefence;
        this.report(`In total, there is ${this.damage} damage. You defend with ${this.teamDefence} team defence.`);
        if (damage > 0) {
            this.report(`There is still ${damage} left.`);
            for (let index = 0; index < damage; index++) {
                pickRandom(this.activePlayers)?.damage();
            }
        }
    }

    electionSignpostSequence(seats: number): number {
        // Webster/Sainte-Laguë method
        return seats + 0.5;
    }

    runResourceElection(votes: number[], numberOfSeats: number): number[] {
        if (votes.length == 0)
            // no one is in the election
            return [];

        let seats = votes.map(() => 0);

        if (Math.max(...votes) <= 0)
            // all candidates in the election has zero votes, they get nothing
            return seats;

        for (let i = 0; i < numberOfSeats; i++) {
            let bestCandidate = -1;
            let bestRatio = -1;

            // pick a candidate with the highest vote average
            for (let j = 0; j < votes.length; j++) {
                let currentRatio = votes[j] / this.electionSignpostSequence(seats[j]);

                if (currentRatio > bestRatio) {
                    bestCandidate = j;
                    bestRatio = currentRatio;
                }
            }

            seats[bestCandidate]++;
        }

        return seats;
    }

    awardResources() {
        let intelPartition = this.runResourceElection(
            this.activePlayers.map((player) => player.electionIntel),
            this.availableIntel
        );
        let sciencePartition = this.runResourceElection(
            this.activePlayers.map((player) => player.electionScience),
            this.availableScience
        );

        for (let i = 0; i < this.activePlayers.length; i++) {
            const player = this.activePlayers[i];
            player.intel += intelPartition[i];
            player.science += sciencePartition[i];

            this.report(`<@${player.id}> gets ${intelPartition[i]} intel and ${sciencePartition[i]} science.`);
        }
    }

    blueOnBlue() {
        for (const player of this.activePlayers) {
            if (player.target) {
                if (player.attack == 0) {
                    this.report(`<@${player.id}> complains about <@${player.target}>.`);
                    continue;
                }

                const target = this.activePlayers.find((p) => p.id == player.target);

                if (target == undefined) continue;

                const attack = Math.min(player.attack, Math.floor(player.power / 10));
                player.power -= attack * 10;
                this.report(`<@${player.id}> engages <@${player.target}>! ${attack} damage.`);

                for (let index = 0; index < attack; index++) {
                    target.damage();
                }
            }
        }
    }

    reportContent = [];
    report(text: string) {
        this.reportContent.push(text);
    }

    storeSlots = 6;

    randomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
    }

    generate() {
        this.store = [];
        for (let index = 0; index < this.storeSlots - this.scienceSlots - this.intelSlots; index++) {
            this.store.push({
                player: undefined,
                bid: this.randomInt(5, 50),
                item: { item: pickRandom([...commonPool, pickRandom(rarePool)]), bonus: { value: 0, alterable: pickRandom(bonusPool) } },
                currency: Currency.matoshi,
            });
        }

        for (let index = 0; index < this.scienceSlots; index++) {
            this.store.push({
                player: undefined,
                bid: this.randomInt(1, 15),
                item: { item: pickRandom([...sciencePool, pickRandom(commonPool)]), bonus: { value: 1, alterable: pickRandom(bonusPool) } },
                currency: Currency.science,
            });
        }

        for (let index = 0; index < this.intelSlots; index++) {
            this.store.push({
                player: undefined,
                bid: this.randomInt(1, 15),
                item: { item: pickRandom([...intelPool, pickRandom(commonPool)]), bonus: { value: 1, alterable: pickRandom(bonusPool) } },
                currency: Currency.intel,
            });
        }

        this.damage = Math.floor(Math.random() * 5 + this.difficulty / 2);
        this.availableIntel = Math.floor(Math.random() * 3 + this.difficulty / 2);
        this.availableScience = Math.floor(Math.random() * 3 + this.difficulty + 3);

        this.report(`Next objective:`);

        this.bonusResources = [Alterable.crew, Alterable.speed, Alterable.sensors];
        //remove one random element from the array
        this.bonusResources.splice(Math.floor(Math.random() * this.bonusResources.length), 1);
        this.report(`${this.bonusResources.join(" and ")} will count as power`);

        Mathoshi.balance(Main.client.user.id).then((bal) => {
            let available = bal - 5000;
            this.matoshiPool = Math.floor(Math.min(available / (100 - this.difficulty), available / 50));
            this.report(`Difficulty: ${this.difficulty}`);
            this.report(`Damage: ${this.damage}`);
            this.report(`Matoshi: ${this.matoshiPool}`);
            this.report(`Available Intel: ${this.availableIntel}`);
            this.report(`Available Science: ${this.availableScience}`);
            Main.gameChannel.send(this.reportContent.join("\n"));
            this.reportContent = [];
            this.dbUpdate();
        });
    }

    bonusResources: Array<Alterable> = [];

    async award() {
        let totalPower = 0;
        for (const player of this.activePlayers) {
            if (player.defence > 0) {
                this.report(`<@${player.id}> contributes:`);
                this.report(`Power: ${player.power}`);
                if (this.bonusResources.includes(Alterable.crew)) {
                    player.power += player.crew;
                    this.report(`Crew: ${player.crew}`);
                }
                if (this.bonusResources.includes(Alterable.sensors)) {
                    player.power += player.sensors;
                    this.report(`Sensors: ${player.sensors}`);
                }
                if (this.bonusResources.includes(Alterable.speed)) {
                    player.power += player.speed;
                    this.report(`Speed: ${player.speed}`);
                }

                totalPower += player.power;
            } else {
                player.power = 0;
            }
        }

        let rewardRatio = totalPower / this.difficulty;
        if (totalPower >= this.difficulty) {
            rewardRatio = 1;
            this.difficulty++;
            this.report(`You win!`);
            this.report(`Difficulty increased to ${this.difficulty}.`);
        } else {
            this.difficulty = 10;
            this.report(`You lost.`);
            this.report(`Difficulty reset to ${this.difficulty}.`);
        }

        shuffle(this.activePlayers);
        const rewardPartition = this.runResourceElection(
            this.activePlayers.map((player) => (player.defence > 0 ? player.power : 0)),
            Math.floor(this.matoshiPool * rewardRatio)
        );

        for (let i = 0; i < this.activePlayers.length; i++) {
            const player = this.activePlayers[i];
            if (player.defence > 0) {
                const toPay = rewardPartition[i];
                this.report(`<@${player.id}> receives ${toPay} ${Currency.matoshi}`);

                if (toPay > 0) {
                    await Mathoshi.pay({ amount: toPay, from: Main.client.user.id, to: player.id }, false);
                }
            }
        }

        if (this.newContentCounter == 0) {
            this.newContentCounter = 3;
            let candidates = [...this.activePlayers];

            //get the smallest contentCount
            const minimum = candidates.sort((a, b) => a.contentCount - b.contentCount)[0].contentCount;

            //filter out all the candidates withcontentCount above the minimum
            candidates = candidates.filter((c) => c.contentCount >= minimum);

            const player = pickRandom(candidates);
            player.contentCount++;

            this.report(`<@${player.id}> was picked to create new content.`);
        } else {
            this.newContentCounter--;
        }
    }

    cleanup() {
        this.teamDefence = 0;
        for (const player of this.activePlayers) {
            player.cleanup();
        }
    }

    processItems() {
        for (const player of this.activePlayers) {
            player.processSimpleItems();
        }

        for (const player of this.activePlayers) {
            player.processItems();
        }
    }

    printBids() {
        return [`Bids:`, ...this.store.map((bid, index) => ` ${index} | ${itemPrinter(bid.item)}\n${bid.player ? `<@${bid.player}>` : "None"}: ${bid.bid} ${bid.currency}`)].join("\n---\n");
    }

    handleBid(player: Player, value: number, bid: number) {
        const currentBid = this.store[bid];
        if (currentBid.player) {
            const oldPlayer = this.getPlayer(currentBid.player);
            if (currentBid.currency == Currency.matoshi) {
                Mathoshi.pay({ amount: currentBid.bid, from: Main.client.user.id, to: currentBid.player }, false);
            } else if (currentBid.currency == Currency.intel) {
                oldPlayer.intel += currentBid.bid;
            } else if (currentBid.currency == Currency.science) {
                oldPlayer.science += currentBid.bid;
            }
        }

        currentBid.player = player.id;
        currentBid.bid = value;
        this.dbUpdate();
    }
}

function itemPrinter(item: EnhancableItem) {
    let text = [];
    const def = itemDefinitons[item.item];
    text.push(def.name);
    if (def.singleUse) text.push("(single use)");

    for (const effect of def.effects) {
        if (effect.condition) {
            text.push(`(${effect.condition.map((condition) => `${condition.type} ${"treshold" in condition ? condition.treshold : ""} ${condition.alterable}`).join(", ")})`);
            text.push(`-> ${effect.alterations.map((alteration) => `${alteration.alterable} ${alteration.value}`).join(", ")}`);
        } else {
            text.push(`(always)\n ${effect.alterations.map((alteration) => `${alteration.alterable} ${alteration.value}`).join(", ")}`);
        }
    }

    text.push(`Bonus: ${item.bonus.value} ${item.bonus.alterable}`);

    return text.join("\n");
}

class Player {
    target?: string;
    contentCount = 0;
    attack = 1;
    game: Game;
    id: string;
    power = 0;
    defence = 0;
    items = new Array<EnhancableItem>();
    stowage = new Array<EnhancableItem>();
    speed = 0;
    sensors = 0;
    crew = 0;
    electionIntel = 0;
    electionScience = 0;

    intel = 0;
    science = 0;
    ammo = 0;

    setTarget(target: string, attack: number) {
        this.target = target;
        this.attack = attack;
        this.game.dbUpdate();
        return `Target set to <@${target}>.`;
    }

    serialisable(): any {
        const copy = Object.assign({}, this);
        delete copy.game;
        return copy;
    }

    ready() {
        if (this.game.activePlayers.includes(this)) {
            return "You are already ready.";
        } else {
            this.game.activePlayers.push(this);
            this.game.dbUpdate();
            return "You are now ready.";
        }
    }

    printItems() {
        return this.items.map((item, index) => `${index} | ${itemPrinter(item)}`).join("\n\n") + "\n\n" + `Ammo: ${this.ammo}\nIntel: ${this.intel}\nScience: ${this.science}\nPower: ${this.power}`;
    }

    printStowage() {
        return this.stowage.map((item, index) => `${index} | ${itemPrinter(item)}`).join("\n\n");
    }

    unready() {
        if (!this.game.activePlayers.includes(this)) {
            return "You are not ready.";
        } else {
            this.game.activePlayers.splice(this.game.activePlayers.indexOf(this), 1);
            this.game.dbUpdate();
            return "You are now unready.";
        }
    }

    stow(id: number) {
        //move item from items to stowage
        if (this.items.length <= id) {
            return "No such item in inventory.";
        }
        const item = this.items[id];
        this.addToStowage(item);
        this.items.splice(id, 1);
        this.game.dbUpdate();
        return `Stowaged ${itemDefinitons[item.item].name}.`;
    }

    unstow(id: number) {
        //move item from stowage to items
        if (this.stowage.length <= id) {
            return "No such item in stowage.";
        }

        if (this.items.filter((item) => !itemDefinitons[item.item].singleUse).length >= 6) {
            return "You can't equip any more items.";
        }

        const item = this.stowage[id];
        this.items.push(item);
        this.stowage.splice(id, 1);
        this.game.dbUpdate();
        return `Unstowaged ${itemDefinitons[item.item].name}.`;
    }

    addToStowage(item: EnhancableItem) {
        this.stowage.push(item);
        this.stowage.sort((a, b) => a.item - b.item);
    }

    giveItemToPlayer(player: Player, id: number) {
        if (this.stowage.length < id) {
            return "No such item in inventory.";
        }
        const item = this.stowage[id];
        player.addToStowage(item);
        this.stowage.splice(id, 1);
        this.game.dbUpdate();
        return `Gave ${itemDefinitons[item.item].name} to <@${player.id}>.`;
    }

    giveAmmoToPlayer(player: Player, amount: number) {
        if (this.ammo < amount) {
            return "Not enough ammo.";
        }
        player.ammo += amount;
        this.ammo -= amount;
        this.game.dbUpdate();
        return `Gave ${amount} ammo to <@${player.id}>.`;
    }

    giveSicenceToPlayer(player: Player, amount: number) {
        if (this.science < amount) {
            return "Not enough science.";
        }
        player.science += amount;
        this.science -= amount;
        this.game.dbUpdate();
        return `Gave ${amount} science to <@${player.id}>.`;
    }

    giveIntelToPlayer(player: Player, amount: number) {
        if (this.intel < amount) {
            return "Not enough intel.";
        }
        player.intel += amount;
        this.intel -= amount;
        this.game.dbUpdate();
        return `Gave ${amount} intel to <@${player.id}>.`;
    }

    processItems() {
        for (const item of [...this.items]) {
            const def = itemDefinitons[item.item];

            for (const effect of def.effects) {
                if (effect.condition && this.conditionsMet(effect.condition)) {
                    this.applyAlterations(effect.alterations);
                }
            }

            if (def.singleUse) {
                this.removeItem(item);
            }
        }
    }

    conditionsMet(conditions: Condition[]): boolean {
        for (const condition of conditions) {
            switch (condition.type) {
                case ConditionType.overTreshold:
                    if (this.getAlterableValue(condition.alterable) < condition.treshold) {
                        return false;
                    }
                    break;

                case ConditionType.underTreshold:
                    if (this.getAlterableValue(condition.alterable) > condition.treshold) {
                        return false;
                    }
                    break;

                case ConditionType.bestInTeam:
                    let max = this.game.activePlayers
                        .reduce((a, b) => (a.getAlterableValue(condition.alterable) > b.getAlterableValue(condition.alterable) ? a : b))
                        .getAlterableValue(condition.alterable);
                    if (this.getAlterableValue(condition.alterable) != max) return false;
                    break;

                case ConditionType.worstInTeam:
                    let min = this.game.activePlayers
                        .reduce((a, b) => (a.getAlterableValue(condition.alterable) < b.getAlterableValue(condition.alterable) ? a : b))
                        .getAlterableValue(condition.alterable);
                    if (this.getAlterableValue(condition.alterable) != min) return false;
                    break;

                default:
                    break;
            }
        }

        return true;
    }

    getAlterableValue(alterable: Alterable): number {
        switch (alterable) {
            case Alterable.power:
                return this.power;
            case Alterable.defence:
                return this.defence;
            case Alterable.speed:
                return this.speed;
            case Alterable.sensors:
                return this.sensors;
            case Alterable.crew:
                return this.crew;
            case Alterable.electionIntel:
                return this.electionIntel;
            case Alterable.electionScience:
                return this.electionScience;
            case Alterable.ammo:
                return this.ammo;
            case Alterable.teamDefence:
                return this.game.teamDefence;
            case Alterable.intelSlots:
                return this.game.intelSlots;
            case Alterable.scienceSlots:
                return this.game.scienceSlots;
            default:
                return 0;
        }
    }

    applyAlterations(alterations: Alteration[]) {
        for (const alteration of alterations) {
            switch (alteration.alterable) {
                case Alterable.power:
                    this.power += alteration.value;
                    break;

                case Alterable.defence:
                    this.defence += alteration.value;
                    break;

                case Alterable.speed:
                    this.speed += alteration.value;
                    break;

                case Alterable.sensors:
                    this.sensors += alteration.value;
                    break;

                case Alterable.crew:
                    this.crew += alteration.value;
                    break;

                case Alterable.electionIntel:
                    this.electionIntel += alteration.value;
                    break;

                case Alterable.electionScience:
                    this.electionScience += alteration.value;
                    break;

                case Alterable.ammo:
                    this.ammo += alteration.value;
                    break;
                case Alterable.teamDefence:
                    this.game.teamDefence += alteration.value;
                    break;

                case Alterable.intelSlots:
                    this.game.intelSlots += alteration.value;
                    break;

                case Alterable.scienceSlots:
                    this.game.scienceSlots += alteration.value;
                    break;
                default:
                    break;
            }
        }
    }

    processSimpleItems() {
        for (const item of [...this.items]) {
            const def = itemDefinitons[item.item];
            for (const effect of def.effects) {
                if (effect.condition == undefined) {
                    this.applyAlterations(effect.alterations);
                }
            }
            this.applyAlterations([item.bonus]);
        }
    }

    removeItem(item: EnhancableItem) {
        this.items.splice(this.items.indexOf(item), 1);
    }

    trashItemFromStowage(itemId: number) {
        if (this.stowage.length < itemId) {
            return "No such item in stowage";
        }
        this.stowage.splice(itemId, 1);
        return "Item removed from stowage";
    }

    cleanup() {
        this.power = Math.round(this.power / 2);
        this.defence = 0;
        this.crew = 0;
        this.sensors = 0;
        this.speed = 0;
        this.electionIntel = 0;
        this.electionScience = 0;
        this.target = undefined;
    }

    async bid(id: number, value: number): Promise<{ success: boolean; message: string }> {
        if (this.game.store.length > id) {
            const item = this.game.store[id];
            if (item.bid >= value) {
                return { success: false, message: `Bid must be higher than ${item.bid}` };
            }
            if (item.currency == Currency.matoshi) {
                const balance = await Mathoshi.balance(this.id);
                if (balance >= value) {
                    Mathoshi.pay({ amount: value, from: this.id, to: Main.client.user.id }, false).then(() => {
                        this.game.handleBid(this, value, id);
                    });
                    return { success: true, message: `<@${this.id}> bid ${value} ${item.currency} for ${itemDefinitons[item.item.item].name}` };
                } else {
                    return { success: false, message: `not enough ${item.currency} (you have ${balance} ${item.currency})` };
                }
            } else {
                if (item.currency == Currency.intel) {
                    if (this.intel >= value) {
                        this.intel -= value;
                        this.game.handleBid(this, value, id);

                        return { success: true, message: `<@${this.id}> bid ${value} ${item.currency} for ${itemDefinitons[item.item.item].name}` };
                    } else {
                        return { success: false, message: `not enough ${item.currency} (you have ${this.intel} ${item.currency})` };
                    }
                }
                if (item.currency == Currency.science) {
                    if (this.science >= value) {
                        this.science -= value;
                        this.game.handleBid(this, value, id);
                        return { success: true, message: `<@${this.id}> bid ${value} ${item.currency} for ${itemDefinitons[item.item.item].name}` };
                    } else {
                        return { success: false, message: `not enough ${item.currency} (you have ${this.science} ${item.currency})` };
                    }
                }
            }
        } else {
            return { success: false, message: "No such item in store" };
        }
    }

    damage() {
        if (this.defence > 0) {
            this.defence--;
            this.game.report(`<@${this.id}> takes damage! (defence: ${this.defence})`);
            return;
        }

        const item = pickRandom(this.items);
        if (item.bonus.value > 0) {
            item.bonus.value = Math.floor(item.bonus.value / 2);
        }

        const def = itemDefinitons[item.item];
        this.game.report(`<@${this.id}> takes damage! ${def.name} is hit!`);
    }

    enhanceCommand(itemId: number, spendId: number) {
        if (this.stowage.length > itemId && this.stowage.length > spendId) {
            if (itemId == spendId) {
                return "You can't enhance the item by itself";
            } else {
                const item = this.stowage[itemId];
                const spend = this.stowage[spendId];
                if (item.item == spend.item) {
                    this.enhance(item, 1);
                    //remove spend item
                    this.stowage.splice(spendId, 1);
                    return ":)";
                } else {
                    return "You can only enhance items of the same type";
                }
            }
        } else {
            return "No such items in inventory";
        }
    }

    enhanceScience(itemId: number) {
        const cost = 25;
        if (this.stowage.length > itemId) {
            if (this.science >= cost) {
                const item = this.stowage[itemId];
                this.enhance(item, 1);
                return `-${cost} science.`;
            } else {
                return `Not enough science (you need ${cost} science, you have ${this.science}) `;
            }
        } else {
            return "No such item in inventory";
        }
    }

    enhance(item: EnhancableItem, severity: number) {
        item.bonus.value += severity;
    }
}

function pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

type EnhancableItem = {
    item: ItemType;
    bonus: Alteration;
};

enum ConditionType {
    overTreshold = "above",
    underTreshold = "below",
    bestInTeam = "best in class",
    worstInTeam = "worst in class",
}

type ConditionOverTreshold = {
    type: ConditionType.overTreshold;
    alterable: Alterable;
    treshold: number;
};

type ConditionUnderTreshold = {
    type: ConditionType.underTreshold;
    alterable: Alterable;
    treshold: number;
};

type ConditionBestInTeam = {
    type: ConditionType.bestInTeam;
    alterable: Alterable;
};

type ConditionWorstInTeam = {
    type: ConditionType.worstInTeam;
    alterable: Alterable;
};

type Alteration = {
    alterable: Alterable;
    value: number;
};

type Condition = ConditionOverTreshold | ConditionUnderTreshold | ConditionBestInTeam | ConditionWorstInTeam;

type ItemEffect = {
    condition?: Array<Condition>;
    alterations?: Array<Alteration>;
};

type ItemDefinition = {
    name: string;
    type: ItemType;
    singleUse: boolean;
    effects: Array<ItemEffect>;
};

const itemDefinitons: Record<ItemType, ItemDefinition> = {
    [ItemType.shipCore]: {
        name: "Main Systems",
        type: ItemType.shipCore,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.speed, value: 2 },
                    { alterable: Alterable.crew, value: 2 },
                    { alterable: Alterable.sensors, value: 2 },
                    { alterable: Alterable.defence, value: 1 },
                ],
            },

            {
                condition: [
                    { type: ConditionType.overTreshold, alterable: Alterable.sensors, treshold: 0 },
                    { type: ConditionType.overTreshold, alterable: Alterable.crew, treshold: 0 },
                    { type: ConditionType.overTreshold, alterable: Alterable.speed, treshold: 0 },
                ],
                alterations: [{ alterable: Alterable.power, value: 5 }],
            },
        ],
    },
    [ItemType.armorPlating]: {
        name: "Armor Plating",
        type: ItemType.armorPlating,
        singleUse: false,
        effects: [
            {
                alterations: [{ alterable: Alterable.defence, value: 2 }],
            },
        ],
    },

    [ItemType.sensorArray]: {
        name: "Sensor Array",
        type: ItemType.sensorArray,
        singleUse: false,
        effects: [
            {
                alterations: [{ alterable: Alterable.sensors, value: 4 }],
            },
        ],
    },

    [ItemType.sonar]: {
        name: "Sonar",
        type: ItemType.sonar,
        singleUse: false,
        effects: [
            {
                alterations: [{ alterable: Alterable.sensors, value: 8 }],
                condition: [{ type: ConditionType.underTreshold, alterable: Alterable.sensors, treshold: 0 }],
            },
        ],
    },

    [ItemType.crewQuarters]: {
        name: "Crew Quarters",
        type: ItemType.crewQuarters,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.crew, value: 5 },
                    { alterable: Alterable.speed, value: -1 },
                ],
            },
        ],
    },

    [ItemType.medbay]: {
        name: "Medbay",
        type: ItemType.medbay,
        singleUse: false,
        effects: [
            {
                alterations: [{ alterable: Alterable.crew, value: 7 }],
            },
        ],
    },

    [ItemType.armory]: {
        name: "Armory",
        type: ItemType.armory,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.crew, value: 2 },
                    { alterable: Alterable.power, value: 5 },
                ],
            },
        ],
    },

    [ItemType.fighterBay]: {
        name: "Fighter Bay",
        type: ItemType.fighterBay,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.crew, value: -3 },
                    { alterable: Alterable.power, value: 11 },
                ],
            },
        ],
    },

    [ItemType.ionThruster]: {
        name: "Ion Thruster",
        type: ItemType.ionThruster,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.speed, value: 6 },
                    { alterable: Alterable.crew, value: -2 },
                ],
            },
        ],
    },

    [ItemType.laserCannon]: {
        name: "Laser Cannon",
        type: ItemType.laserCannon,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.power, value: 5 },
                    { alterable: Alterable.speed, value: -1 },
                ],
            },
        ],
    },

    [ItemType.missileLauncher]: {
        name: "Missile Launcher",
        type: ItemType.missileLauncher,
        singleUse: false,
        effects: [
            {
                condition: [{ type: ConditionType.overTreshold, alterable: Alterable.ammo, treshold: 1 }],
                alterations: [
                    { alterable: Alterable.power, value: 15 },
                    { alterable: Alterable.ammo, value: -1 },
                ],
            },
        ],
    },

    [ItemType.ionCannon]: {
        name: "Ion Cannon",
        type: ItemType.ionCannon,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.power, value: 5 },
                    { alterable: Alterable.crew, value: -1 },
                ],
            },
        ],
    },

    [ItemType.ionTurret]: {
        name: "Ion Defense Turret",
        type: ItemType.ionTurret,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.teamDefence, value: 3 },
                    { alterable: Alterable.crew, value: -2 },
                ],
            },
        ],
    },

    [ItemType.plasmaThruster]: {
        name: "Plasma Thruster",
        type: ItemType.plasmaThruster,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.speed, value: 8 },
                    { alterable: Alterable.sensors, value: -2 },
                ],
            },
        ],
    },

    [ItemType.plasmaCannon]: {
        name: "Plasma Cannon",
        type: ItemType.plasmaCannon,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.power, value: 5 },
                    { alterable: Alterable.crew, value: -1 },
                ],
            },
        ],
    },

    [ItemType.fordwardShield]: {
        name: "Forward Shield",
        type: ItemType.fordwardShield,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.teamDefence, value: 5 },
                    { alterable: Alterable.speed, value: -4 },
                ],
            },
        ],
    },

    [ItemType.pointDefence]: {
        name: "Point Defence",
        type: ItemType.pointDefence,
        singleUse: false,
        effects: [
            {
                condition: [{ type: ConditionType.overTreshold, alterable: Alterable.ammo, treshold: 1 }],
                alterations: [
                    { alterable: Alterable.teamDefence, value: 10 },
                    { alterable: Alterable.ammo, value: -1 },
                ],
            },
        ],
    },

    [ItemType.mobileLab]: {
        name: "Mobile Lab",
        type: ItemType.mobileLab,
        singleUse: false,
        effects: [
            {
                condition: [{ type: ConditionType.bestInTeam, alterable: Alterable.speed }],
                alterations: [{ alterable: Alterable.electionScience, value: 5 }],
            },
            {
                alterations: [
                    { alterable: Alterable.electionScience, value: 1 },
                    { alterable: Alterable.sensors, value: -3 },
                ],
            },
        ],
    },

    [ItemType.researchLab]: {
        name: "Research Lab",
        type: ItemType.researchLab,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.electionScience, value: 3 },
                    { alterable: Alterable.crew, value: -3 },
                ],
            },
        ],
    },
    [ItemType.surveillancePost]: {
        name: "Surveillance Post",
        type: ItemType.surveillancePost,
        singleUse: false,
        effects: [
            {
                condition: [{ type: ConditionType.bestInTeam, alterable: Alterable.electionIntel }],
                alterations: [{ alterable: Alterable.electionIntel, value: 5 }],
            },
            {
                alterations: [
                    { alterable: Alterable.electionIntel, value: 1 },
                    { alterable: Alterable.sensors, value: -3 },
                ],
            },
        ],
    },
    [ItemType.cameraArray]: {
        name: "Camera Array",
        type: ItemType.cameraArray,
        singleUse: false,
        effects: [
            {
                alterations: [
                    { alterable: Alterable.electionIntel, value: 3 },
                    { alterable: Alterable.crew, value: -3 },
                ],
            },
        ],
    },

    [ItemType.ammoCrate]: {
        name: "Ammo Crate",
        type: ItemType.ammoCrate,
        singleUse: true,
        effects: [
            {
                alterations: [{ alterable: Alterable.ammo, value: 20 }],
            },
        ],
    },

    [ItemType.addScience]: {
        name: "Extra Science Shop Slot",
        type: ItemType.addScience,
        singleUse: true,
        effects: [
            {
                alterations: [{ alterable: Alterable.scienceSlots, value: 1 }],
            },
        ],
    },

    [ItemType.removeScience]: {
        name: "Remove Science Shop Slot",
        type: ItemType.removeScience,
        singleUse: true,
        effects: [
            {
                alterations: [{ alterable: Alterable.scienceSlots, value: -1 }],
            },
        ],
    },

    [ItemType.addIntel]: {
        name: "Extra Intel Shop Slot",
        type: ItemType.addIntel,
        singleUse: true,
        effects: [
            {
                alterations: [{ alterable: Alterable.intelSlots, value: 1 }],
            },
        ],
    },

    [ItemType.removeIntel]: {
        name: "Remove Intel Shop Slot",
        type: ItemType.removeIntel,
        singleUse: true,
        effects: [
            {
                alterations: [{ alterable: Alterable.intelSlots, value: -1 }],
            },
        ],
    },
};
