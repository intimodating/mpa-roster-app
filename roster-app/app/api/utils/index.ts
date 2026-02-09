
import moment from 'moment-timezone';

export function getCurrentSingaporeTime() {
    return moment().tz('Asia/Singapore').toDate();
}
