import {settings, on, route, create_server, ratelimited_route, protected_route, serve} from './server.mjs';
import {request_context, apiurl_parse, services_up, set_corsheaders, attach_guruapikey} from './hooks.mjs';
import {favicon, guruapirelay, get_db, get_newapikey, set_newapikey} from './controllers.mjs';
import {set_cell_value} from './db.mjs';

on('request', services_up);
on('request', request_context);
on('request', apiurl_parse);
on('request', attach_guruapikey);
//on('response', set_corsheaders);

route('/favicon.ico', 'GET', favicon);
route('/vr/', 'GET', 'https://www.deltavalue.de/');
//ratelimited_route('/vr/*', 'GET', );
protected_route('/back/db', 'GET', get_db);

serve('localhost', '3000', () => {
    console.log("request received");
});