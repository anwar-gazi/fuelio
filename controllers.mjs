import https from "https";
import { get_context } from "./server.mjs";
import { settings } from "./settings.mjs";
import { readFileSync } from "node:fs";
import { Buffer } from "buffer";
import { generate_apikey, assert_json } from "./utils.mjs";

export const guruapirelay = (request, response) => {
    const { guru_apikey, stocksymbols } = get_context('request');
    https.get(
            "https://api.gurufocus.com/public/user/" +
                guru_apikey + "/stock/" + stocksymbols + "/financials",
            (gururesponse) => {
                let data = [];
                gururesponse.on("data", (chunk) => {
                    data.push(chunk);
                });
                gururesponse.on("end", () => {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    const data = Buffer.concat(data).toString();
                    assert_json(data, "guruapidatanotjson");
                    response.end(Buffer.concat(data).toString());
                });
            }
        )
        .on("error", (err) => {
            console.log("Error: ", err.message);
        });
};

export const notfound = (req, res) => {
    res.end("404");
};

export const redirect = (req, res, {target}) => {
    res.writeHead(settings.httpcode.redirect, {Location: target});
    res.end();
};

export const favicon = (req, res) => {
    res.writeHead(200, { "Content-Type": "image/x-icon" });
    res.end("BaselineLab.ico");
};

export const get_db = (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', settings.contenttypeexcel);
    const buffer = readFileSync(settings.EXCELFILEPATH, {});
    res.end(buffer);
};

export const set_cell_value = (req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
        const [cellname, value] = JSON.parse(Buffer.concat(chunks).toString());
        set_cell_value(cellname, value);
    });
    res.end('evet');
};

export const get_new_apikey = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify([generate_apikey(), 0, 1]));
};

export const set_new_apikey = (req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
        const [key, enabled, rate_hr] = JSON.parse(Buffer.concat(chunks).toString());
        await set_cell_value(null, [key, enabled.toString(), rate_hr.toString()], {
            append: true
        });
    });
    res.setHeader('Content-Type', 'text/html');
    res.statusCode = 200;
    res.end('evet');
};

//Alhamdulillah
