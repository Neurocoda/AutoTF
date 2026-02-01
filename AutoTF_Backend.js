/*
 * AutoTF_Backend.js
 * @Author: Neurocoda
 * @Description: AutoTF Backend
 *
 * [API Specification]
 * GET  /auto-tf/list             -> Returns cached data from DB
 * POST /auto-tf/add {id}         -> Fetches name, saves to DB
 * POST /auto-tf/del {id}         -> Deletes from DB
 * POST /auto-tf/rebuild          -> Force refreshes ALL apps
 * POST /auto-tf/rebuild {ids:[]} -> Force refreshes SELECTED apps
 *
 * [Quantumult X Configuration]
 * [http_backend]
 * AutoTF/AutoTF_Backend.js, tag=AutoTF_Backend.js, path=^/auto-tf/, enabled=true
 */

const STORE_KEY = "TF_ID";

const userAgents = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_7_9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
];

const $req = typeof $request !== "undefined" ? $request : null;

!(async () => {
    if (!$req) { $done({}); return; }

    try {
        const method = $req.method;
        const path = $req.path;
        let data = getStoredData();

        if (method === "GET" && path.indexOf("/list") !== -1) {
            const listItems = data.map(item => ({
                title: item.name,
                subtitle: `ID: ${item.id}`,
                arg: item.id
            }));
            responseJSON(200, { "items": listItems });
            return;
        }

        if (method === "POST" && path.indexOf("/add") !== -1) {
            let json = safeParse($req.body);
            let newId = json.id;
            if (!newId) throw new Error("ID cannot be empty");
            
            if (data.some(i => i.id === newId)) throw new Error(`ID ${newId} already exists`);

            const appInfo = await getAppInfo(newId);
            data.push({ id: newId, name: appInfo.name });
            
            if (saveData(data)) {
                responseJSON(200, { code: 200, message: `Added: ${appInfo.name}` });
            } else {
                throw new Error("Failed to save data");
            }
            return;
        }

        if (method === "POST" && path.indexOf("/del") !== -1) {
            let json = safeParse($req.body);
            let delId = json.id;
            if (!delId) throw new Error("ID cannot be empty");

            const exists = data.some(i => i.id === delId);
            if (!exists) throw new Error(`ID ${delId} not found`);

            data = data.filter(i => i.id !== delId);
            
            if (saveData(data)) {
                responseJSON(200, { code: 200, message: `Deleted: ${delId}` });
            } else {
                throw new Error("Failed to save data");
            }
            return;
        }

        if (method === "POST" && path.indexOf("/rebuild") !== -1) {
            let json = safeParse($req.body);
            let targetIds = [];

            if (json.ids && Array.isArray(json.ids)) {
                targetIds = json.ids;
            } else if (json.id) {
                targetIds = [json.id];
            }
            
            let isFullRebuild = targetIds.length === 0;
            let updatedCount = 0;

            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                
                if (!isFullRebuild && !targetIds.includes(item.id)) {
                    continue;
                }

                const info = await getAppInfo(item.id);
                data[i].name = info.name;
                updatedCount++;

                let totalTargets = isFullRebuild ? data.length : targetIds.length;
                if (updatedCount < totalTargets) {
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
            
            if (saveData(data)) {
                let mode = isFullRebuild ? "Full" : "Selective";
                responseJSON(200, { code: 200, message: `${mode} Rebuild Complete. Updated ${updatedCount} apps.` });
            } else {
                throw new Error("Failed to save rebuilt data");
            }
            return;
        }

        responseJSON(404, { error: "Route not found" });

    } catch (err) {
        responseJSON(500, { error: err.message });
    }
})();

// --- Helper Functions ---

function responseJSON(code, data) {
    let statusLine = "HTTP/1.1 200 OK";
    if (code === 404) statusLine = "HTTP/1.1 404 Not Found";
    if (code === 500) statusLine = "HTTP/1.1 500 Internal Server Error";

    $done({
        status: statusLine,
        headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(data)
    });
}

function safeParse(str) {
    try { return JSON.parse(str); } catch (e) { return {}; }
}

function getStoredData() {
    const rawData = $prefs.valueForKey(STORE_KEY);
    if (!rawData) return [];
    try {
        let parsed = JSON.parse(rawData);
        if (!Array.isArray(parsed)) return [];
        // Migration: [id1, id2] -> [{id: id1, name: "Pending..."}, ...]
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
            return parsed.map(id => ({ id: id, name: "Pending Update... (Please Rebuild)" }));
        }
        return parsed;
    } catch (e) { 
        if (rawData.includes(",")) {
            return rawData.split(",").map(i => ({ id: i.trim(), name: "Pending Update... (Please Rebuild)" })).filter(i => i.id);
        }
        return []; 
    }
}

function saveData(data) {
    return $prefs.setValueForKey(JSON.stringify(data), STORE_KEY);
}

function getAppInfo(id) {
    return new Promise((resolve) => {
        const req = { 
            url: `https://testflight.apple.com/join/${id}`, 
            headers: { 
                'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                'Accept-Language': 'en-US,en;q=0.9'
            } 
        };
        $task.fetch(req).then(resp => {
            let name = "Unknown App";
            const html = resp.body;
            const titleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
            
            if (titleMatch) {
                let rawName = titleMatch[1];
                if (rawName.includes("TestFlight - Apple")) {
                    name = "Unavailable (Closed/Full)";
                } else if (/[「“](.*?)[”」]/.test(rawName)) {
                    const quoteMatch = rawName.match(/[「“](.*?)[”」]/);
                    if (quoteMatch && quoteMatch[1]) name = quoteMatch[1].trim();
                } else {
                    name = rawName
                        .replace(/^(Join the|加入|參與)\s+/i, "")
                        .replace(/\s+(beta|Beta|PC beta|版|測試版).*$/i, "")
                        .replace(/—.*$/, "")
                        .trim();
                }
            }
            resolve({ id, name });
        }, () => resolve({ id, name: "Network Error" }));
    });
}