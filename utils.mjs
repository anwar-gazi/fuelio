//Bismillahir Rahmanir Rahim
import { existsSync, rmSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { join, extname } from 'path';
import { settings } from './settings.mjs';
import { get_data_rows, get_data_row, backup_apikeysfile } from './db.mjs';
import pkg from 'crypto-js';
const { MD5 } = pkg;
import { createClient } from 'redis';

export const doc = (name) => {
    console.log(name, ' doc not available');
};

/**
 *
 * @param {string} cellname e.g. A1, B1, A12 etc
 * @throws Error on invalid
 * @todo known limitation: two character column names like AB1, AB12 are not supported
 */
export const validate_cellname = (cellname) => {
    if (cellname.length < 2) throw new Error('cellname length must be minimum two char');
    const first_char_code = cellname.slice(0, 1).charCodeAt();
    const second_char_int = parseInt(cellname.slice(1));
    if (first_char_code <= 65 && first_char_code >= 90) throw new Error('cellname first char must be A-Z');
    if (!second_char_int || second_char_int in [0, 1])
        throw new Error('column 0 invalid for cellname, column 1 is reserved for header');
    return true;
};

export const assert_cellname_or_index = (x) => {
    if (!parseInt(x)) {
        validate_cellname(x);
    }
};

export const is_excel_file = (filepath) => {
    return filepath.includes('.xlsx');
};

export const assert_existing_excel_file = (filepath) => {
    const msg = 'notexcelfile:'+filepath;
    if (!existsSync(filepath) || !is_excel_file(filepath)) throw new Error(msg);
};

export const toInt = (x) => {
    if (!x) return 0;
    if (typeof x === 'string') return parseInt(x);
};

export const options_object = (default_opts, provided_opts) => {
    return provided_opts? {...default_opts, ...provided_opts} : {...default_opts};
};

export const copy_object = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

export const generate_apikey = () => {
    return MD5(Date.now() + 'salt' + Math.random()).toString();
};

export const is_guruapirelay_url = (url) => {
    url = trim_slashes(url);
    const prefix = settings.urlprefix.guruapirelay;
    const regex = new RegExp(`^${prefix}/.+?/.+`);
    return regex.test(url);
};

export const assert_guruapirelay_url = (url, msg) => {
    msg = msg || 'notguruapirelayurl:'+url;
    if (!is_guruapirelay_url(url)) throw new Error(msg);
};

export const assertnot_guruapirelay_url = (url, msg) => {
    msg = msg || 'isguruapirelayurl:'+url;
    if (is_guruapirelay_url(url)) throw new Error(msg);
};

export const parseurl_guruapirelay = (url) => {
    url = trim_slashes(url) + '/';
    const prefix = settings.urlprefix.guruapirelay;
    const portions = url.match(new RegExp(`^${prefix}/(.+?)/(.+?)/$`));
    return {
        apikey: portions[1],
        stocksymbols: portions[2],
        expected: '/vr/<apikey>/<stocksymbols>/',
        matched: portions[0],
        input: portions.input
    };
};

export const guruapirelay_url = (apikey, stocksymbols, opts) => {
    const {server, noprefix} = options_object({server: 'default', noprefix: false}, opts);
    const protocol = settings.server[server].https ? 'https' : 'http';
    const host = settings.server[server].host;
    const port = settings.server[server].port;
    const prefix = noprefix? '' : settings.urlprefix.guruapirelay;
    const root = `${protocol}://${host}:${port}`;
    return root + '/' + join(prefix, apikey, stocksymbols);
};

/**
 * @param {function} callback run this function several times
 * @param {number|array} times run the callback how many times
 * @return array of callback run result if times is array, 
    callback runs over each array element
 */
export const run_omuk_times = (callback, times) => {
    const elements = typeof times === 'number' ? Array(times) : times;
    const result = [];
    for (const a of elements) {
        result.push(callback(a));
    }
    return result;
};

/**
 * Start a unaffecting testable system by initializing a test database
 * @param {callable} seed you may do seeing inside the init, 
    or do it yourself after init
 * @returns {callable} a callback to close/end the test system
 * TODO note that our original settings object address is lost. 
 * @deprecated
 */
export const init_test_system = async ({ seed }) => {
    const bkpath = await backup_apikeysfile();
    const prevexcelfilepath = settings.EXCELFILEPATH;
    settings.EXCELFILEPATH = bkpath;
    if (seed) seed();
    return function close_test_system() {
        rmSync(bkpath);
        settings.EXCELFILEPATH = prevexcelfilepath;
        return true;
    };
};

export const isolated = async (func) => {
    const prevsettings = copy_object(settings);
    const bkpath = await backup_apikeysfile();
    settings.db.excel.path = bkpath;
    func();
    rmSync(bkpath, {force:true});
    for (const key of Object.keys(prevsettings)) {
        settings[key] = prevsettings[key];
    }
};

export const lastchar = (text) => {
    return text[text.length - 1];
};

export const easypattern_to_regex = (pattern) => {
    const patternmap = {'*':'(.+?)'};
    for(const [key, val] of Object.entries(patternmap)) {
        if (pattern.includes(key)) pattern = pattern.replace(key, val);
    }
    return new RegExp(pattern);
};

export const extract = (text, regex) => {
    const res = text.match(regex);
    if (res) return [...res.slice(1, )];
};

export const trim = (text, charset, opts) => {
    const { left, right } = options_object({left: undefined, right: undefined}, opts);
    charset = charset || '';
    const pattern = `[\\s${charset}]+`;
    let regex = new RegExp(`^${pattern}|${pattern}$`, 'g');
    if (left) regex = new RegExp(`^${pattern}`);
    if (right) regex = new RegExp(`${pattern}$`);
    return text.replace(new RegExp(regex), '');
};

export const ltrim = (text, charset) => {
    return trim(text, charset, { left: true });
};

export const rtrim = (text, charset) => {
    return trim(text, charset, { right: true });
};

export const trim_slashes = (path) => {
    return trim(path, '/');
};

export const is_array = (x, opts) => {
    const {nonempty} = options_object(opts, {nonempty:false});
    return typeof x === 'object' && x.length >= (nonempty ? 1 : 0);
};

export const arrayfy = (x) => {
    return is_array(x) ? x : [x];
};

export const is_string = (x) => {
    return typeof x === 'string';
};

export const is_url = (text) => {
    return /^http[s]?:\/\/.+$/.test(text);
};

export const assert_file_exist = (path) => {
    if (!existsSync(path)) throw new Error("filenotexists:"+path);
};

export const assert_existing_apikey = async (apikey, msg) => {
    msg = msg || 'notexistingapikey';
    const row = await get_data_row({apikey});
    if (row.apikey!==apikey) throw new Error(msg);
};

export const is_equal = (eta, ota) => {
    if (is_array(eta) && is_array(ota) && eta.length==ota.length) {
        eta.sort();
        ota.sort();
        for (let i = 0; i < eta.length; i++) {
            if (eta[i] !== ota[i]) return false;
        }
    } else {
        if (eta !== ota) {
            return false;
        }
    }
    return true;
};

export const assert_equal = (eta, ota, msg) => {
    msg = (msg || 'assertequalfail:')+`'${eta}' !== '${ota}'`;
    if (!is_equal(eta, ota)) throw new Error(msg);
};

export const assert_notequal = (eta, ota, msg) => {
    msg = (msg || 'assertnotequalfail:')+`'${eta}' === '${ota}'`;
    if (is_equal(eta, ota)) throw new Error(msg);
};

export const assert_truthy = (v, msg) => {
    if (!v) {
        throw new Error(msg);
    }
    assert_true(v, false);
};

export const assert_true = (v, strict) => {
    const outcome = strict ? v === true : v == true;
    if (!outcome) {
        throw new Error('not true');
    }
};

export const assert_string = (x, msg) => {
    msg = msg || 'notstring';
    x = !is_array(x) ? [x] : x;
    for (const a of x) {
        if (typeof a !== 'string') {
            throw new Error(msg+':'+a);
        }
    }
};

export const assert_json = (text) => {
    JSON.parse(text);
};

export const assert_notjson = (text) => {
    try {
        JSON.parse(text);
    } catch (e) {
        return true;
    }
    throw new Error('notjsonexpected,butfoundjson:'+text);
};

export const assert_substring = (text, sub, msg) => {
    msg = msg ? msg : 'assert fail';
    if (!text.includes(sub)) {
        throw new Error(msg);
    }
};

export const assert_redis_running = async () => {
    const client = createClient();
    await client.connect();
    if (!client.isReady) {
            throw new Error('redis not ready');
        } else {
            await client.set('test', 'test');
            assert_equal((await client.get('test')), 'test');
        }
    return true;
};

export const assert_callable = (x, msg) => {
    msg = msg || 'notcallable';
    x = !is_array(x) ? [x] : x;
    for (const f of x) {
        if (typeof f !== 'function') {
            throw new Error(msg);
        }
    }
};

//Alhamdulillah
