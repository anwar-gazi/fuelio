# A nano-framework for NodeJS based web-apps development, i.e., nano-express

- supports router and hooks (middleware)
- builtin support for api rate limiting

## install

`npm install`

## example front script (main.js)


```js
import {settings, on, route, create_server, ratelimited_route, protected_route, serve} from './server.mjs';
import {request_context, apiurl_parse, services_up, set_corsheaders, attach_guruapikey} from './hooks.mjs';
import {favicon, guruapirelay, get_db, get_newapikey, set_newapikey} from './controllers.mjs';
import {set_cell_value} from './db.mjs';

on('request', services_up);
on('response', set_corsheaders);

route('/favicon.ico', 'GET', favicon);
route('/vr/', 'GET', 'https://www.deltavalue.de/');
ratelimited_route('/vr/*', 'GET', );
protected_route('/back/db', 'GET', get_db);

serve('localhost', '3000', () => {
    console.log("request received");
});
```

## API rate limiting

define a ratelimited route

```js
ratelimited_route('/vr/*', 'GET', );
```

## authentication

define route

```js
protected_route('/back/db', 'GET', get_db);
```

