import {on, route} from "../server.mjs";
import {services_up} from "../hooks.mjs";
import {settings} from "../settings.mjs";
import {favicon} from "../controllers.mjs";

/**
 * it also tests server hook function
 */
export const test_on = () => {
    let success = false;
    on('request', services_up);
    let collection = settings.server['default'].hooks['onrequest'];
    collection.forEach((hook_callback) => {
        if (hook_callback === services_up) {
            success = true;
        }
    });
    if (!success) return false;
}

/**
 * we are expecting it to fail
 * @returns {boolean}
 */
export const test_route_duplication = () => {
    route('404', 'GET', () => {
    });
    let success = false;
    let routes = settings.server['default'].routes;
    routes.forEach((route) => {
        if (route[0] === '404') {
            success = true;
        }
    });
    if (!success) return false;
};