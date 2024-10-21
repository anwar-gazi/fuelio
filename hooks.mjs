import {guru_apikey} from "./env.mjs";
import {Redis} from "./db.mjs";
import { set_context, get_context } from "./server.mjs";
import { is_guruapirelay_url, parseurl_guruapirelay, assert_string, 
    assert_existing_apikey, assert_redis_running, assert_file_exist } from "./utils.mjs";
import { available, log } from "./apirate.mjs";
import { settings } from "./settings.mjs";


export const set_cors_headers = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers['origin']);
    res.setHeader('Access-Control-Allow-Headers', 'access-control-allow-origin');
    res.setHeader('Vary', 'origin');
    res.statusCode = 200;
    return true;
};

export const request_context = (req) => {
    return set_context('request', req);
};

export const apiurl_parse = (req) => {
    let apikey = undefined;
    let stocksymbols = undefined;
    if (is_guruapirelay_url(req.url)) {
        const {apikey, stocksymbols} = parseurl_guruapirelay(req.url);
        assert_string([apikey, stocksymbols], "apikey and stocksymbols should be string");
        assert_existing_apikey(apikey);
    }
    return set_context('request', {apikey, stocksymbols});
};

export const attach_guruapikey = () => {
    set_context('request', {guru_apikey: guru_apikey});
};

export const services_up = () => {
    assert_redis_running();
    assert_file_exist(settings.db.excel.path);
    settings.db.redis = new Redis();
};

export const is_authenticated = () => {
    return get_context('request').user.authenticated;
};

export const guruapirelay_rateavailable = () => {
    const {apikey} = get_context('request');
    if (!available(apikey, settings.apirate.default_intervals)) {
        throw new Error('ratelimitexceed');
    } else {
        return true;
    } 
};
export const guruapirelay_log = () => {
    const {apikey} = get_context('request');
    return log(apikey, settings.apirate.default_intervals);
};

//Alhamdulillah
