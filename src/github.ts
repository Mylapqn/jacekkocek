import { App, Octokit } from "octokit";
//import { createAppAuth } from "@octokit/auth-app";
const installationId = 34798513;
const appId = "300408"

const app = new App({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY
});
let octokit: Octokit;

export async function init() {
    octokit = await app.getInstallationOctokit(installationId)
}
/*
const auth = createAppAuth({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: installationId,
})
*/
export async function test() {
    console.log(await octokit.request("GET /issues", {

    }));
}