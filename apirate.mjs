// Bismillahir Rahmanir Rahim
import { get_data_row, get_apiuse, log_apiuse } from "./db.mjs";

const current_time_info = () => {
    const dateObj = new Date();
    return {
        current_hour_id: 'hourID:' + dateObj / (1000 * 3600),
        current_month_id: 'monthID:' + dateObj.getFullYear() + '-' + dateObj.getMonth()
    };
};

export const monthly = (apikey) => {
    return {
        intervalId: current_time_info().current_month_id,
        limitvalue: apikey ? get_data_row({ apikey }).rate : undefined
    };
};

export const hourly = (apikey) => {
    return {
        intervalId: current_time_info().current_hour_id,
        limitvalue: apikey ? get_data_row({ apikey }).rate_hr : undefined
    };
};


export const available = (apikey, { intervals }) => {
    const available_counts = [];
    for (const interval of intervals) {
        const { intervalId, limitvalue } = interval();
        const { use_count } = get_apiuse(intervalId, apikey);
        const available_count = limitvalue - use_count ? use_count : 0;
        if (!available_count) return false;
        available_counts.push(available_count);
    }
    return available_counts;
};

export const log = (apikey, { intervals }) => {
    for (const interval of intervals) {
        const { intervalId } = interval();
        log_apiuse(intervalId, apikey);
    }
    return true;
};

// Alhamdulillah
