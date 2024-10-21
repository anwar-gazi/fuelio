// noinspection SpellCheckingInspection
//Bismillahir Rahmanir Rahim
import http from 'http';
import {settings as _s_} from './settings.mjs';
import {is_string, trim, assert_callable} from './utils.mjs';
import {redirect, notfound} from './controllers.mjs';
import {is_authenticated, guruapirelay_rateavailable, guruapirelay_log} from './hooks.mjs';

export const settings = () => {
    return _s_;
};

export const host = (server = 'default') => {
    return _s_.server[server].host;
};
export const port = (server = 'default') => {
    return _s_.server[server].port;
};

/**
 *
 * @param eventname
 * @param callable
 * @param opts possible keys are server
 */
export const on = (eventname, callable, opts) => {
    opts = opts || {};
    opts.eventname = eventname;
    hook(callable, opts);
};

/**
 *
 * @param x
 * @param opts possible keys are server, eventname
 */
const hook = (x, opts) => {
    opts = opts || {};
    const server = opts.server || 'default';
    const eventname = opts.eventname;
    let attach_to = '';
    if (eventname === 'request') {
        attach_to = 'onrequest';
    } else if (eventname === 'response') {
        attach_to = 'aftercontroller';
    }
    assert_callable(x);
    settings.server[server].hooks[attach_to].push(x);
};

/**
 *
 * @param path
 * @param http_method
 * @param controller
 * @param opts
 * @throws Error for route defined already
 */
export const route = (path, http_method, controller, opts) => {
    opts = opts || {};
    const server = opts.server || 'default';
    const beforecontrollerhooks = opts.beforecontrollerhooks || [];
    const aftercontrollerhooks = opts.aftercontrollerhooks || [];

    if (is_string(controller)) {
        const redirect_to = controller;
        controller = (req, res) => {
            redirect(req, res, {target: redirect_to});
        };
    }
    if (beforecontrollerhooks) assert_callable(beforecontrollerhooks);
    if (aftercontrollerhooks) assert_callable(aftercontrollerhooks);
    if (settings.server[server].routes.filter(([routepath]) => routepath === path).length) {
        throw new Error('routealreadydefined');
    }
    settings.server[server].routes.push([
        path,
        http_method,
        controller,
        {
            hooks: {
                beforecontroller: beforecontrollerhooks,
                aftercontroller: aftercontrollerhooks
            }
        }
    ]);
};

export const protected_route = (path, method, controller, opts) => {
    route(path, method, controller, {...opts, beforecontrollerhooks: [is_authenticated]});
};

export const ratelimited_route = (path, method, controller, intervals, opts) => {
    assert_callable(intervals);
    route(path, method, controller, {
        ...opts,
        beforecontrollerhooks: guruapirelay_rateavailable,
        aftercontrollerhooks: guruapirelay_log
    });
};

export const easypattern_to_regex = (pattern) => {
    if (pattern.includes('*')) {
        pattern = pattern.replace('*', '(.+?)');
    }
    return new RegExp('^' + pattern + '$');
};

const routepath_matches = (path, pathmethods, url, urlmethod) => {
    path = trim(path, '/');
    url = trim(url, '/');
    pathmethods = is_string(pathmethods) ? [pathmethods] : pathmethods;
    if (pathmethods.indexOf(urlmethod) === -1) return false;

    if (url === path) return {exactmatch: true};

    const regex = easypattern_to_regex(path);
    const outcome = url.match(regex);
    if (!outcome) return false;
    return {
        exactmatch: false,
        input: outcome.input,
        match: outcome[0],
        patternmatch: [...outcome.slice(1)]
    };
};

const execute_onrequest_hooks = (req, res, {server}) => {
    server = server || 'default';
    const {hooks} = settings.server[server];
    for (const hook of hooks.onrequest) {
        const proceed = hook(req, res);
        if (proceed === false) throw new Error('onrequesthookfalse');
    }
};
const execute_aftercontroller_hooks = (req, res, {server}) => {
    server = server || 'default';
    const {hooks} = settings.server[server];
    for (const hook of hooks.aftercontroller) {
        const proceed = hook(req, res);
        if (proceed === false) throw new Error('aftercontrollerhookfalse');
    }
};
const get_matchedrouteinfo = (req, {server}) => {
    server = server || 'default';
    const {routes} = settings.server[server];
    for (const [routepath, routemethod, routecontroller, opts] of routes) {
        const matchresult = routepath_matches(routepath, routemethod, req.url, req.method);
        if (matchresult !== false) {
            const {patternmatch} = matchresult;
            const routematchedpatterns = patternmatch;
            const routehooks = opts.hooks;
            return {routepath, routemethod, routecontroller, routehooks, routematchedpatterns};
        }
    }
    return {
        routepath: undefined,
        routemethod: undefined,
        routecontroller: notfound,
        routehooks: undefined,
        routematchedpatterns: req.url
    };
};

const execute_routehooksbeforecontroller = (req, res, {server}) => {
    const {routehooks} = get_matchedrouteinfo(req, {server});
    if (!routehooks) return routehooks;
    for (const hook of routehooks.beforecontroller) {
        const proceed = hook(req, res);
        if (proceed === false) throw new Error('routebeforecontrollerhookfalse');
    }
    return true;
};

const execute_routehooksaftercontroller = (req, res, {server}) => {
    const {routehooks} = get_matchedrouteinfo(req, {server});
    if (!routehooks) return routehooks;
    for (const hook of routehooks.aftercontroller) {
        const proceed = hook(req, res);
        if (proceed === false) throw new Error('routeaftercontrollerhookfalse');
    }
    return true;
};

const execute_routecontroller = (req, res, {server}) => {
    const {routecontroller, routematchedpatterns} = get_matchedrouteinfo(req, {server});
    routecontroller(req, res, routematchedpatterns);
};

export const create_server = () => {
    return http.createServer((req, res) => {
        execute_onrequest_hooks(req, res, onrequest_hooks());
        execute_routecontroller(req, res, controllers());
    });
};

export const serve = (host, port, callback) => {
    create_server().listen(host(), port(), () => {
        typeof callback === 'function' ? callback({host, port}) : '';
    });
};

// open a context i.e., create key 'name' in settings.server.contexts
// merge if the context has
export const set_context = (name, x, {server}) => {
    server = server || 'default';
    const contexts = settings[server].contexts;
    x = is_callable(x) ? x() : x;
    if (contexts[name] && is_object(contexts[name])) {
        contexts[name] = is_object(x) ? {...contexts[name], ...x} : '';
    } else {
        contexts[name] = x;
    }
    settings[server].contexts = contexts;
    return settings[server].contexts;
};

export const get_context = (name, {server}) => {
    server = server || 'default';
    return settings[server].contexts[name];
};

//Alhamdulillah
