import { ChannelType, Client, ThreadChannel } from "discord.js";
import { DbObject } from "./dbObject";
import * as Matoshi from "./matoshi";
import { User } from "./user";
import * as Discord from "discord.js";
import { client, operationsChannel, policyValues } from "./main";
import { simpleDateString } from "./utilities";
import * as lt from "long-timeout";

export class Assignment extends DbObject {
    static dbIgnore: string[] = [...super.dbIgnore, "timerToken", "declineTimerToken", "warningTimerToken", "oversightWarningToken"];
    description = "";
    due = 0;
    userId = "";
    supervisorId = "";
    reward = 0;
    done = false;
    closed = false;
    threadId = "";
    declineTimerToken: lt.Timeout;
    timerToken: lt.Timeout;
    warningTimerToken: lt.Timeout;
    oversightWarningToken: lt.Timeout;
    version = 1;

    static timerCache = new Map<string, lt.Timeout>();
    static temporaryTasks = new Map<string, Assignment>();

    public get thread(): ThreadChannel<boolean> {
        return operationsChannel.threads.cache.find((t) => t.id == this.threadId);
    }

    static async temporaryTask(description: string, due: Date, user: User, reward: number, supervisor: User) {
        const task = new Assignment();
        task.description = description;
        task.due = due.valueOf();
        task.userId = user.id;
        task.supervisorId = supervisor.id;
        const streakBonus = Math.min(Math.max(user.streak / 10, 0), 1) + 1;
        task.reward = reward;
        await task.createThread();

        const embed = new Discord.EmbedBuilder()
            .setColor(0x00ffff)
            .setDescription(`<@${supervisor.id}> suggested a task for you, <@${user.id}>: ${description}.`)
            .addFields(
                { inline: false, name: "Deadline", value: `<t:${Math.floor(task.due / 1000)}:R>` },
                { inline: false, name: "Reward", value: `${reward} x ${streakBonus} (from ${user.streak} streak) = ${task.reward * streakBonus} ₥` }
            );

        task.thread.send({ components: [this.acceptButton()], embeds: [embed], content: `<@${user.id}> <@${supervisor.id}>` }).then((msg) => msg.edit(""));

        this.temporaryTasks.set(task.threadId, task);
        task.declineTimerToken = lt.setTimeout(() => task.declineTask(), 60 * 60 * 1000);
    }

    async createThread() {
        this.threadId = (await operationsChannel.threads.create({ type: ChannelType.PublicThread, name: `${simpleDateString(new Date(this.due))} ${this.description}` })).id;
    }

    async acceptTask() {
        this.start(this.description, new Date(this.due), await User.get(this.userId), this.reward, await User.get(this.supervisorId));
        lt.clearTimeout(this.declineTimerToken);
        Assignment.temporaryTasks.delete(this.threadId);
    }

    async declineTask() {
        lt.clearTimeout(this.declineTimerToken);
        await this.thread.setLocked(true);
        await this.thread.setArchived(true);
        Assignment.temporaryTasks.delete(this.threadId);
    }

    static async assign(description: string, due: Date, user: User, reward: number, supervisor?: User) {
        const task = new Assignment();
        task.description = description;
        task.due = due.valueOf();
        task.userId = user.id;
        await task.createThread();
        await task.dbUpdate();
        user.taskIds.push(task._id);
        task.start(description, due, user, reward, supervisor);
        await user.dbUpdate();
        return task;
    }

    async start(description: string, due: Date, user: User, reward: number, supervisor?: User) {
        const streakBonus = Math.min(Math.max(user.streak / 10, 0), 1) + 1;
        this.reward = Math.floor(reward * streakBonus);
        this.description = description;
        this.due = due.valueOf();
        this.userId = user.id;
        let newActionRow: Discord.ActionRowBuilder<Discord.ButtonBuilder>;
        const embed = new Discord.EmbedBuilder()
            .setColor(0xffff00)
            .setTitle(description)
            .addFields([
                { inline: false, name: "Deadline", value: `<t:${Math.floor(this.due / 1000)}:R>` },
                { inline: false, name: "Reward", value: `${reward} x ${streakBonus} (from ${user.streak} streak) = ${this.reward} ₥` },
                { inline: false, name: "User", value: `<@${user.id}>` },
            ]);

        if (supervisor) {
            newActionRow = Assignment.addButtons(true);
            embed.addFields([{ inline: false, name: "Supervisor", value: `<@${supervisor.id}>` }]);
            this.supervisorId = supervisor.id;
        } else {
            newActionRow = Assignment.addButtons(false);
        }
        this.thread.send({ components: [newActionRow], embeds: [embed], content: `<@${user.id}>` + (supervisor ? `<@${supervisor.id}>` : "") }).then((msg) => msg.edit(""));
        await this.dbUpdate();
        this.timer();
    }

    private static addButtons(asSupervisor: boolean): Discord.ActionRowBuilder<Discord.ButtonBuilder> {
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        if (!asSupervisor) {
            newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentSupervise", label: "Supervise", style: Discord.ButtonStyle.Primary }));
        }
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentCancel", label: "Cancel", style: Discord.ButtonStyle.Danger }));
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentComplete", label: "Complete", style: Discord.ButtonStyle.Success }));
        return newActionRow;
    }

    private static acceptButton(): Discord.ActionRowBuilder<Discord.ButtonBuilder> {
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentAccept", label: "Accept", style: Discord.ButtonStyle.Primary }));
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentDecline", label: "Decline", style: Discord.ButtonStyle.Danger }));

        return newActionRow;
    }

    private static confirmButton(addSupervisor: boolean): Discord.ActionRowBuilder<Discord.ButtonBuilder> {
        let newActionRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>();
        if (addSupervisor) {
            newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentSupervise", label: "Supervise", style: Discord.ButtonStyle.Primary }));
        }
        newActionRow.addComponents(new Discord.ButtonBuilder({ customId: "assignmentConfirm", label: "Confirm", style: Discord.ButtonStyle.Success }));
        return newActionRow;
    }

    async requestCancel() {
        if (this.supervisorId) {
            this.thread.send(`Contact the Supervisor <@${this.supervisorId}> to cancel this task.`);
        } else {
            await this.cancel(false);
        }
    }

    async cancel(fail = true) {
        const user = await User.get(this.userId);
        user.taskIds.splice(user.taskIds.indexOf(this._id), 1);
        let result;
        if (fail) {
            if (user.streak > 0) {
                user.streak = 0;
            }
            result = "failure";
        } else {
            result = "canceled";
        }
        this.closed = true;
        user.lastTask = Date.now();
        await user.dbUpdate();
        await this.showResult(result, this.reward, user.streak, !!this.supervisorId);
        await this.thread.setLocked(true);
        await this.thread.setArchived(true);
        lt.clearTimeout(this.timerToken);
        lt.clearTimeout(this.warningTimerToken);
        lt.clearTimeout(this.oversightWarningToken);
        this.dbUpdate();
    }

    async showResult(result: "success" | "failure" | "canceled", rewarded: number, newstreak: number, supervisor: boolean) {
        let embed = new Discord.EmbedBuilder();
        if (result == "success") {
            embed.setColor(0x99ff99).setTitle(`Task completed`);
            embed.addFields([{ name: "Reward", value: rewarded + " ₥" }]);
            if (supervisor) embed.addFields([{ name: "Supervision reward", value: policyValues.matoshi.assignmentSupervisionReward + "₥" }]);
        } else if (result == "canceled") {
            embed.setColor(0xffff99).setTitle(`Task canceled`);
        } else {
            embed.setColor(0xff9999).setTitle(`Task failed`);
        }

        embed.addFields([{ name: "New streak", value: newstreak + "" }]);

        await this.thread.send({ embeds: [embed], content: `<@${this.userId}>` + (supervisor ? `<@${this.supervisorId}>` : "") }).then((msg) => msg.edit(""));
    }

    async setSupervisior(supervisorId: string): Promise<string | undefined> {
        if (supervisorId == this.userId) {
            return `You cannot be Supervisor for your own task.`;
        } else {
            if (this.supervisorId) {
                return `<@${this.supervisorId}> is already supervising this task`;
            }
        }
        this.thread.send(`Okay. <@${supervisorId}> is now Supervisor for this task.`);
        lt.clearTimeout(this.oversightWarningToken);
        this.supervisorId = supervisorId;
        this.dbUpdate();
    }

    private readonly warnTime = 6 * 60 * 60 * 1000;
    private readonly noSupervisorWarnTime = 6 * 60 * 60 * 1000;

    timer() {
        const delay = this.due - Date.now();
        if (delay > 0) {
            this.timerToken = lt.setTimeout(() => this.deadline(), delay);
            this.oversightWarningToken = lt.setTimeout(() => this.noSupervisor(), this.noSupervisorWarnTime);
            if (delay - this.warnTime > 0) this.warningTimerToken = lt.setTimeout(() => this.warning(), delay - this.warnTime);
            Assignment.timerCache.set(this._id.toHexString(), this.timerToken);
            Assignment.timerCache.set(this._id.toHexString() + "w", this.warningTimerToken);
            Assignment.timerCache.set(this._id.toHexString() + "o", this.oversightWarningToken);
        } else {
            this.deadline();
        }
    }

    async noSupervisor() {
        await this.dbRefresh();
        if (this.supervisorId) return;
        operationsChannel.send(`<#${this.threadId}> is looking for supervision.`);
        this.oversightWarningToken = lt.setTimeout(() => this.noSupervisor(), this.noSupervisorWarnTime);
        Assignment.timerCache.set(this._id.toHexString() + "o", this.oversightWarningToken);
        await this.dbUpdate();
    }

    warning() {
        let embed = new Discord.EmbedBuilder();
        embed.setColor(0xffaa00).setTitle(`Deadline in ${((this.due - Date.now()) / 1000 / 60 / 60).toFixed(1)} hours`);
        this.thread.send({ embeds: [embed], content: `<@${this.userId}>` }).then((msg) => msg.edit(""));
    }

    complete() {
        lt.clearTimeout(this.timerToken);
        lt.clearTimeout(this.warningTimerToken);

        this.done = true;
        const newActionRow = Assignment.confirmButton(undefined == this.supervisorId);
        let text = `Task completed before deadline. Find a Supervisor who can confirm this.`;
        if (this.supervisorId) {
            text = `Task completed before deadline. Your Supervisor <@${this.supervisorId}> will now confirm this.`;
        }
        this.thread.send({ components: [newActionRow], content: text });
        this.dbUpdate();
    }

    static async getByThread(id: string) {
        const task = await this.fromData(await Assignment.dbFind<Assignment>({ threadId: id }));
        return task;
    }

    async confirmComplete() {
        const user = await User.get(this.userId);
        this.closed = true;
        user.streak++;
        user.lastTask = Date.now();
        await Matoshi.pay({ amount: this.reward, from: client.user.id, to: user }, false);
        await this.showResult("success", this.reward, user.streak, true);
        await Promise.all([this.dbUpdate(), user.dbUpdate()]);
        await this.thread.setLocked(true);
        await this.thread.setArchived(true);
        await Matoshi.pay({ amount: policyValues.matoshi.assignmentSupervisionReward, from: client.user.id, to: this.supervisorId }, false);
    }

    async deadline() {
        lt.clearTimeout(this.oversightWarningToken);
        try {
            await this.cancel();
        } catch (error) {
            this.closed = true;
            this.dbUpdate();
        }
    }

    static override async fromData(data?: Partial<Assignment>) {
        const newObject = (await super.fromData(data)) as Assignment;
        Object.assign(newObject, data);
        if (data.version == undefined) newObject.version = undefined;
        newObject.timerToken = Assignment.timerCache.get(newObject._id.toHexString());
        newObject.warningTimerToken = Assignment.timerCache.get(newObject._id.toHexString() + "w");
        newObject.oversightWarningToken = Assignment.timerCache.get(newObject._id.toHexString() + "o");
        return newObject;
    }

    static async loadTasks() {
        const tasks = await Assignment.dbFindAll<Assignment>({ closed: false });
        for (const taskData of tasks) {
            const task = await Assignment.fromData(taskData);
            if (!task.done) {
                task.timer();
                if (task.version == undefined) {
                    task.version = 1;
                    task.thread.send({ components: [Assignment.addButtons(task.supervisorId != undefined)] });
                    task.dbUpdate();
                }
            }
        }
    }
}
