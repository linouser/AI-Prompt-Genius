import {getObject, setObject} from "./utils.js";

export function finishAuth(){
    // checks localstorage for current auth task and then uses fresh API token to do it
    const authTask = localStorage.getItem("authTask")
    const token = localStorage.getItem("GOOGLE_API_TOKEN")

    if (authTask === "setupSync"){
        linkSheet(token)
        clearAuthTask()
    }

}

async function linkSheet(token) {
    try {
        const data = await checkForExisting(token);
        const existing = data.files.length > 0;
        if (existing) {
            const sheetId = data.files[0].id;
            setObject("cloudSyncing", true)
            localStorage.setItem("sheetID", sheetId)
            const prompts = getPrompts()
            let promptIDList = prompts.length > 0 ? prompts.map((obj) => obj.id) : [];
            // TODO recreate resync function
            syncPrompts([], [], promptIDList, prompts, sheetId)
        } else {
            await newSheet(token);
        }
    } catch (error) {
        console.error(error);
    }
}

function clearAuthTask(){
    localStorage.setItem("authTask", "")
}

async function checkForExisting(token) {
    // Checks for existing Gsheet in the API
    const endpointUrl =
        "https://www.googleapis.com/drive/v3/files" +
        "?fields=files(id,name,mimeType,createdTime)" +
        "&q=trashed=false";
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${token}`);
    try {
        const response = await fetch(endpointUrl, {
            method: "GET",
            headers: headers,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch data from endpoint");
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error:", error);
    }
}

function getPrompts(){
    return getObject("prompts", [])
}


async function newSheet(token) {
    try {
        const spreadsheetId = await createSpreadsheet(token);
        let prompts = getPrompts();
        prompts = prompts.map((prompt) => {
            return {...prompt, tags: prompt.tags.join(";")}
        });
        const values = JSONtoNestedList(prompts);
        const requestBody = {
            values: values,
        };
        const range = "Sheet1!A1:Z" + values.length;
        const valueInputOption = "USER_ENTERED";
        const response = await fetch(
            "https://sheets.googleapis.com/v4/spreadsheets/" +
            spreadsheetId +
            "/values/" +
            range +
            "?valueInputOption=" +
            valueInputOption,
            {
                method: "PUT",
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            },
        );
        if (!response.ok) {
            throw new Error("Failed to populate spreadsheet");
        }
        //console.log("Successfully populated the spreadsheet with the prompts list!");
        setObject("cloudSyncing", true)
        localStorage.setItem("sheetID", spreadsheetId)
        chrome.runtime.sendMessage({
            params: [[], [], prompts, prompts, spreadsheetId],
            type: "resync",
        });
    } catch (error) {
        console.error(error);
    }
}

async function getSheetData(spreadsheetId, range) {
    try {
        const mumboJumbo = "AIzaSyAjjnHsq4rkzK7jtjZ_zvs62lT8nqeQVoU"; // this isn't dangerous but you can ignore it
        const token = await getAuthToken();
        const endpointUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${mumboJumbo}`;
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${token}`);
        const response = await fetch(endpointUrl, {
            method: "GET",
            headers: headers,
        });
        if (!response.ok) {
            throw new Error("Failed to fetch data from endpoint");
        }
        const data = await response.json();
        const headersRow = [
            "category",
            "date",
            "id",
            "lastChanged",
            "tags",
            "text",
            "time",
            "title",
        ]; // allows user to translate if they want
        console.log(data)
        if (!data.values){
            return []
        }
        const values = data.values.slice(1);
        const jsonData = values.map((row) => {
            const obj = {};
            headersRow.forEach((header, index) => {
                if (header === "tags") {
                    obj[header] = row[index].split(";");
                    if (obj[header][0] === "") {
                        obj[header] = [];
                    }
                } else {
                    obj[header] = row[index];
                }
            });
            return obj;
        });
        return jsonData.reverse();
    } catch (error) {
        console.error(error);
    }
}

async function syncPrompts(deletedPrompts, newPrompts, changedPrompts, localPrompts, sheetId) {
    try {
        // Get prompts from the Google Sheets version
        const syncedPrompts = await getSheetData(sheetId, "Sheet1!A1:Z");

        // Remove deleted prompts from the cloud version
        deletedPrompts.forEach((id) => {
            const index = syncedPrompts.findIndex((prompt) => prompt.id === id);
            if (index !== -1) {
                syncedPrompts.splice(index, 1);
            }
        });

        // Add new/revised prompts to the cloud version
        newPrompts.concat(changedPrompts).forEach((id) => {
            let localPrompt = localPrompts.find((prompt) => prompt.id === id);
            let cloudPrompt = syncedPrompts.find((prompt) => prompt.id === id);

            if (localPrompt) {
                if (!cloudPrompt) {
                    syncedPrompts.push(localPrompt);
                } else {
                    // Merge the two prompts
                    if (
                        cloudPrompt?.lastChanged === undefined ||
                        localPrompt?.lastChanged > cloudPrompt?.lastChanged
                    ) {
                        let newLastChanged
                        if (!localPrompt?.lastChanged && !cloudPrompt?.lastChanged) {
                            newLastChanged = new Date().getTime();
                        } else if (localPrompt?.lastChanged > cloudPrompt?.lastChanged) {
                            newLastChanged = localPrompt.lastChanged;
                        } else {
                            newLastChanged = new Date().getTime();
                        }
                        cloudPrompt.tags = localPrompt.tags.join(";");
                        cloudPrompt = {...localPrompt, tags: localPrompt.tags.join(";"), lastChanged: newLastChanged}
                    }

                    // Find the index of the merged prompt in the sheetData array
                    const index = syncedPrompts.findIndex((prompt) => prompt.id === id);

                    // Replace the old prompt with the merged prompt
                    if (index !== -1) {
                        syncedPrompts[index] = cloudPrompt;
                    } else {
                        syncedPrompts.push(cloudPrompt);
                    }
                }
            }
        });

        // Update the Chrome storage version with the merged data
        const correctTags = [];
        for (let prompt of syncedPrompts) {
            if (typeof prompt.tags === "string") {
                if (prompt?.tags[0] && prompt?.tags !== "") {
                    prompt.tags = prompt.tags.split(";");
                }
            }
            correctTags.push(prompt);
        }

        setObject("prompts", correctTags)
        setObject("deletedPrompts", [])
        setObject("changedPrompts", [])
        setObject("newPrompts", [])

        const time = new Date().getTime();
        setObject("lastSynced", time)
        // Update the Google Sheets version with the merged data
        await updateSheetData(sheetId, "Sheet1!A1:Z", syncedPrompts);
    } catch (error) {
        console.error(error);
    }
}


async function createSpreadsheet(token) {
    // creates a new Google Sheet for Syncing
    const metadata = {
        name: "AI Prompt Genius",
        mimeType: "application/vnd.google-apps.spreadsheet",
    };
    try {
        const response = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(metadata),
        });
        if (!response.ok) {
            await linkSheet();
            throw new Error("Failed to create new spreadsheet");
        }
        const jsonResponse = await response.json();
        return jsonResponse.id;
    } catch (error) {
        console.error(error);
    }
}

function JSONtoNestedList(prompts) {
    if (prompts.length === 0) {
        return [
            [
                "description",
                "folder",
                "id",
                "lastChanged",
                "tags",
                "text",
                "title",
            ],
        ];
    }

    // TODO: re-add this??
    //prompts = prompts.reverse();

    const headers = [
        "description",
        "folder",
        "id",
        "lastChanged",
        "tags",
        "text",
        "title",
    ];
    const values = [];

    // Add headers to the values array
    values.push(headers);

    // Loop through each prompt in the array
    for (let prompt of prompts) {
        const promptValues = [];

        // Loop through each header and check if the prompt has the key
        for (let header of headers) {
            if (Object.prototype.hasOwnProperty.call(prompt, header)) {
                // If the prompt has the key, add the value to the promptValues array
                if (Array.isArray(prompt[header])) {
                    promptValues.push(prompt[header].join(";"));
                } else {
                    promptValues.push(prompt[header]);
                }
            } else {
                // If the prompt does not have the key, add an empty string to the promptValues array
                promptValues.push("");
            }
        }

        // Add the promptValues array to the values array
        values.push(promptValues);
    }

    return values;
}