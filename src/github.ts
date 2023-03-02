import { App, Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { request } from "@octokit/request";
const installationId = 34798513;
const appId = "300408"

/* const app = new App({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY
}); */
let octokit: Octokit;
let token;

const auth = createAppAuth({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: installationId,
})

export async function init() {
    //octokit = await app.getInstallationOctokit(installationId)
    token = await auth({ type: "installation" })
}



export async function test() {
    await request("POST /repos/Mylapqn/jacekkocek/issues", {
        headers: {
            authorization: "bearer " + token
        },
        owner: 'Mylapqn',
        repo: 'jacekkocek',
        title: 'Test',
        body: 'Test desc',
        labels: [
            'request'
        ],
    });
    /* console.log(await octokit.request("POST /repos/Mylapqn/jacekkocek/issues", {
        owner: 'Mylapqn',
        repo: 'jacekkocek',
        title: 'Test',
        body: 'Test desc',
        labels: [
          'request'
        ],
    })); */
}