import { App, Octokit } from "octokit";

const installationId = "34798513";
const appId = "300408"

const app = new App({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY
});
const octokit = new Octokit({});
export async function auth() {
    console.log(await octokit.request({
        url: "/repos/Mylapqn/jacekkocek/installation",
        method: "GET"
    }))

}