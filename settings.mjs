// noinspection SpellCheckingInspection

import {dirname, join as join_path} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const settings = {
    db: {
        redis: undefined,
        excel: {
            path: join_path(__dirname, 'db/db.xlsx'),
            header: ['apikey', 'enabled', 'rate', 'rate_hr'],
            backupdir: join_path(__dirname, 'db/bk')//disable backuping by setting BACKUPDESTDIR=''
        }
    },
    contenttype: {
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    server: {
        default: {
            host: null,
            port: null,
            contexts: {
                request: {
                    user: {authenticated: false}
                }
            },
            hooks: {
                onrequest: [],
                aftercontroller: []
            },
            routes: [
                ['404', ['GET'], undefined, {hooks: {beforecontroller: [], aftercontroller: []}}]
            ]
        }
    },
};
