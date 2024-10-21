import { join as join_path } from 'path';
import { open, copyFile } from 'node:fs/promises';
import { utils, read, write } from 'xlsx';
import { settings } from './settings.mjs';
import { createClient } from 'redis';
import { toInt, assert_equal, options_object, 
    validate_cellname, assert_cellname_or_index, 
    assert_existing_excel_file} from './utils.mjs';

export const backup_apikeysfile = async () => {
    const destfile = join_path(settings.db.excel.backupdir, 'db.bk-' + Date.now() + '.xlsx');
    await copyFile(settings.db.excel.path, destfile);
    return destfile;
};

const cellname_to_dataarrayindex = (cellname) => {
    const col = cellname.slice(0).charCodeAt() - 65;
    const row = parseInt(cellname.slice(-1)) - 1;
    return { row, col };
};

/**
 *
 * @param {String} cellname
 * @param {String|Array} value array if opts.append=true
 * @param {object} opts opts.origin
 */
export const excel_set = async (value, opts) => {
    const {filepath, cellname} = options_object(
        {filepath: undefined, cellname: undefined}, opts);
    assert_existing_excel_file(filepath);
    const cellname_or_index = cellname;
    assert_cellname_or_index(cellname_or_index);
    const controller = new AbortController();
    const { signal } = controller;
    let fdr, fdw;
    try {
        fdr = await open(filepath, 'r');
        const rb = await fdr.readFile({ signal });
        const workbook = read(rb);
        const first_worksheet = workbook.Sheets[workbook.SheetNames[0]];
        utils.sheet_add_aoa(first_worksheet, [[value]], {
            origin: cellname_or_index
        });
        const wb = write(workbook, { bookType: 'xlsx', type: 'buffer' });
        await fdr.close();
        fdr = null;

        fdw = await open(filepath, 'w');
        await fdw.writeFile(wb);
        await fdw.close();
        fdw = null;
    } catch (err) {
        throw new Error(err);
    } finally {
        if (fdr) fdr.close();
        if (fdw) fdw.close();
    }
};

export const excel_set_row = (filepath, row_index, data) => {
    excel_set(data, {filepath, cellname: row_index});
};

export const excel_append_row = (filepath, data) => {
    excel_set(data, {filepath, cellname: -1});
};

export const dbexcel_set_cell_value = (cellname, value, opts) => {
    opts = opts || {};
    opts.cellname = cellname;
    opts.filepath = settings.db.excel.path;
    backup_apikeysfile();
    excel_set(value, opts);
};

/**
 * @deprecated
 * @param {string} cellname uppercase, 2 digit string, representing cell name e.g., A1, B1 etc
 * @todo inefficient. Takes whole sheet content at first then locates the cell content.
 */
export const get_cell_value = (cellname) => {
    validate_cellname(cellname);
    const { datarow_index, datacol_index } = cellname_to_dataarrayindex();
    return get_data_rows(datarow_index, 1)[0][datacol_index];
};

/**
 *
 * @param {number} start first row index, zero based, e.g., 0, 1, 2, 3 etc
 * @param {number} number_of_rows
 * @returns {Array}
 */
export const get_data_rows = async (start, number_of_rows) => {
    start = start ? start : 0;
    const controller = new AbortController();
    const { signal } = controller;
    const fd = await open(settings.db.excel.path, 'r');
    let rb;
    try {
        rb = await fd.readFile();
    } catch (err) {
        throw new Error(err);
    } finally {
        await fd.close();
    }
    const workbook = read(rb);
    const first_worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const arr = utils.sheet_to_json(first_worksheet, {
        header: settings.db.excel.header,
        range: 1,
        defval: ''
    });
    number_of_rows = number_of_rows ? number_of_rows : arr.length;
    return arr.slice(start, start + number_of_rows);
};

export const get_data_row = async ({ apikey }) => {
    const row = (await get_data_rows()).filter((row) => {
        if (apikey && row.apikey === apikey) {
            return true;
        }
    });
    assert_equal(row.length, 1, 'duplicate or notexisting apikey:'+apikey);
    return row[0];
};

export class Redis {
    constructor() {
        this.client = createClient();
    }
    async connect() {
        await this.client.connect();
        this.client.on('error', (err) => {
            console.error('redis error ', err);
        });
    }
    is_connected() {
        return this.client.isReady;
    }
    async set(key, value) {
        return await this.client.set(key, value);
    }
    async get(key) {
        return await this.client.get(key);
    }
}

export const redis = () => {
    return settings.db.redis;
};

export const get_apiuse = async (interval_id, apikey) => {
    const use_count = toInt(await redis().get(`${apikey}:${interval_id}`));
    return { use_count };
};
export const set_apiuse = async (interval_id, apikey, use_count) => {
    return await redis().set(`${apikey}:${interval_id}`, use_count);
};
export const log_apiuse = async (interval_id, apikey) => {
    const { use_count } = await get_apiuse(interval_id, apikey);
    return await set_apiuse(interval_id, apikey, use_count + 1);
};

//Alhamdulillah
