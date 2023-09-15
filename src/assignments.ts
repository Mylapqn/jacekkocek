import { ChannelType, Client, ThreadChannel } from "discord.js";
import { DbObject } from "./dbObject";
import * as Matoshi from "./matoshi";
import { User } from "./user";
import { client, operationsChannel } from "./main";
import { simpleDateString } from "./utilities";

export class Assignment extends DbObject {
    static dbIgnore: string[] = [...super.dbIgnore, "timerToken"];
    description = "";
    due = 0;
    userId = "";
    supervisorId = "";
    reward = 0;
    done = false;
    closed = false;
    threadId = "";
    timerToken: NodeJS.Timeout;

    static timerCache = new Map<string, NodeJS.Timeout>();

    public get thread(): ThreadChannel<boolean> {
        return operationsChannel.threads.cache.find((t) => t.id == this.threadId);
    }

    static async assign(description: string, due: Date, user: User, reward: number, supervisorId: string) {
        const task = new Assignment();
        task.description = description;
        task.due = due.valueOf();
        task.userId = user.id;
        const streakBonus = Math.min(Math.max(user.streak / 10, 0), 1) + 1;
        task.reward = reward * streakBonus;
        await task.dbUpdate();
        user.taskIds.push(task._id);
        const thread = await operationsChannel.threads.create({ type: ChannelType.PublicThread, name: `${simpleDateString(due)} ${description}` });
        task.threadId = thread.id;
        task.thread.send(`Task:\n${description}\nDeadline:<t:${Math.floor(task.due / 1000)}:R>\nReward: ${reward} x ${streakBonus} (from ${user.streak} streak) = ${task.reward} ₥\nUser: <@${user.id}>`);
        await task.dbUpdate();
        task.timer();

        if(supervisorId){
            thread.send(`<@${supervisorId}> you are invited to supervise this assingment.`);
        }

        return task;
    }

    async requestCancel() {
        if (this.supervisorId) {
            this.thread.send(`Contact your Supervisor <@${this.supervisorId}> to cancel this task.`);
        } else {
            await this.cancel(false);
        }
    }

    async cancel(fail = true) {
        const user = await User.get(this.userId);
        user.taskIds.splice(user.taskIds.indexOf(this._id), 1);
        if (fail) {
            if (user.streak > 0) {
                await this.thread.send(`Task failed. Your streak of ${user.streak} is lost.`);
                user.streak = 0;
                await user.dbUpdate();
            } else {
                await this.thread.send(`Task failed.`);
            }
        } else {
            await this.thread.send(`Task canceled.`);
        }
        if (this.supervisorId) {
            await this.thread.send(`<@${this.supervisorId}>, you are now relieved from your duties.`);
        }
        this.closed = true;
        await this.thread.setLocked(true);
        await this.thread.setArchived(true);
        this.dbUpdate();
        clearTimeout(this.timerToken);
    }

    async setSupervisior(supervisorId: string) {
        const user = await User.get(this.userId);
        if (supervisorId == this.userId) {
            this.thread.send(`You cannot be Supervisor for your own task.`);
        } else {
            this.thread.send(`Okay. <@${supervisorId}> is now Supervisor for this task.`);
            if (!this.supervisorId) {
                this.thread.send(`<@${this.userId}>\nyou will be rewarded ${this.reward} ₥ after your Supervisor confirms that you have completed the task`);
                if (user) this.thread.send(`Failure to complete the task in time will result in a streak reset.`);
            }
            this.supervisorId = supervisorId;
            this.dbUpdate();
        }
    }

    timer() {
        const delay = this.due - Date.now();
        if (delay > 0) {
            this.timerToken = setTimeout(() => this.deadline(), delay);
            Assignment.timerCache.set(this._id.toHexString(), this.timerToken);
        } else {
            this.deadline();
        }
    }

    complete() {
        clearTimeout(this.timerToken);
        this.done = true;
        this.dbUpdate();
        if (this.supervisorId) {
            this.thread.send(`Task completed before deadline. Your Supervisor <@${this.supervisorId}> will now confirm this.`);
        } else {
            this.thread.send(`Task completed before deadline. Find a Supervisor who can confirm this.`);
        }
    }

    static async getByThread(id: string) {
        const task = await this.fromData(await Assignment.dbFind<Assignment>({ threadId: id }));
        return task;
    }

    async confirmComplete() {
        const user = await User.get(this.userId);
        Matoshi.pay({ amount: this.reward, from: client.user.id, to: this.userId }, false);
        this.closed = true;
        user.streak++;
        await this.thread.send(`Confirmed. <@${this.userId}> your streak is now ${user.streak}`);
        await Promise.all([this.dbUpdate(), user.dbUpdate()]);
        await this.thread.setLocked(true);
        await this.thread.setArchived(true);
    }

    async deadline() {
        this.thread.send("The task was not completed in time.");
        await this.cancel();
    }

    static override async fromData(data?: Partial<Assignment>) {
        const newObject = (await super.fromData(data)) as Assignment;
        Object.assign(newObject, data);
        newObject.timerToken = Assignment.timerCache.get(newObject._id.toHexString());
        return newObject;
    }

    static async loadTasks() {
        const tasks = await Assignment.dbFindAll<Assignment>({ closed: false });
        for (const taskData of tasks) {
            const task = await Assignment.fromData(taskData);
            if (!task.done) {
                task.timer();
            }
        }
    }
}
