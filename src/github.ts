import { Octokit } from "octokit";

const installationId = 34798513;
const appId = 300408

const octokit = new Octokit({
    auth: process.env.GITHUB_PERSONAL_API_KEY
})

//TODO GITHUB_PRIVATE_KEY_PATH file instead of env string
//TODO App authentification
/*

const app = new App({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY
});

let token;
const auth = createAppAuth({
    appId: appId,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
    installationId: installationId,
    clientSecret: process.env.GITHUB_API_KEY,
    clientId: "Iv1.5a1e31d3239f66d5",
})

export async function init() {
    octokit = await app.getInstallationOctokit(installationId)
    token = await auth({ type: "installation" })
}

export async function test() {
    await request("POST /repos/Mylapqn/jacekkocek/issues", {
        headers: {
            authorization: "token " + token
        },
        owner: 'Mylapqn',
        repo: 'jacekkocek',
        title: 'Test',
        body: 'Test desc',
        labels: [
            'request'
        ],
    });
}*/

export async function createIssue(title: string, desc: string, label: string, author: string) {
    let response = await octokit.request("POST /repos/Mylapqn/jacekkocek/issues", {
        owner: 'Mylapqn',
        repo: 'jacekkocek',
        title: title,
        body: desc + "\n\n_Created from command by " + author + "_",
        labels: [
            label,
            "from command"
        ],
    })
    if (response.status == 201) {
        return response.data.html_url;
    }
    else {
        throw new Error("Error creating issue")
    }
}
