//Bismillahir Rahmanir Rahim
import { test } from '@playwright/test';
import { join } from 'path';
import { dbexcel_set_cell_value, get_data_rows } from './db.mjs';
import {
    toInt,
    trim,
    ltrim,
    rtrim,
    trim_slashes,
    generate_apikey,
    parseurl_guruapirelay,
    assert_guruapirelay_url,
    assertnot_guruapirelay_url,
    assert_equal,
    assert_notequal,
    isolated,
    guruapirelay_url,
    run_omuk_times,
    lastchar,
    easypattern_to_regex,
    is_url,
    assert_file_exist,
    assert_existing_apikey,
    assert_true,
    assert_string,
    assert_json,
    assert_notjson,
    assert_substring,
    assert_redis_running,
    assert_callable,
    extract
} from './utils.mjs';
import { settings } from './settings.mjs';

export const test_set_cell_value = async () => {
    await dbexcel_set_cell_value('A2', 'newapikey1');
    assert_equal((await get_data_rows())[0].apikey, 'newapikey1', 'apikeynotset');
};

export const test_trim = () => {
    assert_equal(trim('  //trim//vr/apikey/wmt///  ', '/'), 'trim//vr/apikey/wmt');
};

export const test_ltrim = () => {
    assert_equal(ltrim('  ltrim//vr/apikey//wmt/  ', '/'), 'ltrim//vr/apikey//wmt/  ');
};

export const test_rtrim = () => {
    const text = '  //rtrim//apikey/wmt///  ';
    assert_equal(rtrim(text), '  //rtrim//apikey/wmt///');
};

export const test_trim_slashes = () => {
    assert_equal(trim_slashes('  /trimslashes//vr/apikey/wmt///  '), 'trimslashes//vr/apikey/wmt');
};

export const test_urlparse_for_apikey = () => {
    const { apikey, stocksymbols } = parseurl_guruapirelay('/vr/apikey1/wmt/');
    assert_equal(apikey, 'apikey1');
    assert_equal(stocksymbols, 'wmt');
};

export const test_toInt = () => {
    assert_equal(toInt('6'), 6);
};

export const test_is_guruapirelay_url = () => {
    assert_guruapirelay_url('/vr/apikey/stock,symbols/');
    assertnot_guruapirelay_url('/some/apikey/stock,symbols/');
};

export const test_guruapiurl_parse = () => {
    const { apikey, stocksymbols } = parseurl_guruapirelay('/vr/972382e2h2yet27/WMT,GOGL,AAPL');
    assert_string([apikey, stocksymbols]);
    assert_equal(apikey, '972382e2h2yet27');
    assert_equal(stocksymbols, 'WMT,GOGL,AAPL');
};

export const test_build_guruapirelay_url = () => {
    const server = 'default';
    const protocol = settings.server[server].https ? 'https' : 'http';
    const host = settings.server[server].host;
    const port = settings.server[server].port;
    const root = `${protocol}://${host}:${port}`;
    const prefix = settings.urlprefix.guruapirelay;
    assert_equal(
        guruapirelay_url('apikey', 'wmt,gogl', { noprefix: false }),
        root + '/' + join(prefix, 'apikey', 'wmt,gogl')
    );
    assert_equal(guruapirelay_url('apikey', 'wmt,gogl', { noprefix: true }), root + '/' + join('apikey', 'wmt,gogl'));
};

export const test_run_omuk_times = () => {
    let val = 0;
    const res = run_omuk_times(() => {
        val += 1;
        return val;
    }, 6);
    assert_equal(val, 6);
    assert_equal(res, [1, 2, 3, 4, 5, 6]);
};

export const test_isolated = () => {
    const file = settings.db.excel.path;
    const dir = settings.db.excel.backupdir;
    isolated(() => {
        assert_notequal(settings.db.excel.path, file);
        settings.db.excel.backupdir = undefined;
        settings.server.default.contexts.request.user.authenticated = true;
    });
    assert_equal(settings.db.excel.backupdir, dir);
    assert_equal(settings.server.default.contexts.request.user.authenticated, false);
};

export const test_lastchar = () => {
    assert_equal('x', lastchar('uvwx'));
};

export const test_easypattern_to_regex = () => {
    const regex = easypattern_to_regex('/x/*/z/');
    const text = '/x/abc/123/abc123/!#@$@%@^@&@**TWUWH^@%@009e7e6/z/';
    assert_true(regex.test(text));
    const [portion] = extract(text, regex);
    assert_string(portion);
};

export const test_is_url = () => {
    assert_true(is_url('http://localhost:3000/some/'));
    assert_true(!is_url('/some/path/not/really/url/'));
};

export const test_file_exist = () => {
    assert_file_exist(settings.db.excel.path);
};

export const test_existing_apikey = async () => {
    const { apikey } = (await get_data_rows(0, 1))[0];
    await assert_existing_apikey(apikey);
};

export const test_assert_json = () => {
    assert_json('{"success": "true", "statusCode": "200"}');
    assert_notjson('notjson<div>');
};

export const test_substring = () => {
    assert_substring('superstring', 'strin');
};

export const test_redisrunning = async () => {
    await assert_redis_running();
};

export const test_assert_callable = () => {
    assert_callable(() => {});
    assert_callable([() => {}, () => {}]);
};

const test_apiserver_urlvr_requirement = async () => {
    isolated(() => {
        const apikey = generate_apikey();
        const url = guruapirelay_url(apikey, 'wmt', { noprefix: true });
        test('', async (page) => {
            await page.goto(url);
            assert_equal(page.waitForResponse((resp) => resp.url === url).status(), settings.httpcode.redirect);
            assert_substring(page.url(), 'deltavalue.de');
        });
    });
};

const test_server_is_returning_findata_properly = () => {
    isolated(() => {
        const apikey = generate_apikey();
        const url = guruapirelay_url(apikey, 'wmt');
        test('', async (page) => {
            await page.goto(url);
            assert_equal(page.waitForResponse((resp) => resp.url === url).status(), settings.httpcode.success);
            assert_json(page.content());
        });
    });
};

// server.js
import { on } from './server.mjs';
export const test_hook = () => {
    const samplehook = () => {
        console.log('testhook');
    };
    assert_callable([samplehook]);
    on('request', samplehook);
    assert_equal(settings.server.default.hooks.onrequest.length, 1);
};
import { route } from "./server.mjs";
export const testonly_route = () => {
    const path = '/';
    const method = 'GET';
    const controller = () => {};
    route(path, method, controller);
    assert_equal(settings.server['default'].routes.filter(r => r[0]=='/').length, 1);
};

// Alhamdulillah
