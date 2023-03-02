import { App, Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
const installationId = 34798513;
const appId = "300408"

const app = new App({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY
});
const octokit = new Octokit({});

const auth = createAppAuth({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: installationId,
})

export async function test() {
    let o = await app.getInstallationOctokit(installationId);
    console.log(o);


}