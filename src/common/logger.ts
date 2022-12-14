import dayjs from 'dayjs';

export async function info(gid: string | undefined, event: string, message?: string) {
    console.log(`[${dayjs().format('YYYY/MM/DD HH:mm:ss')}/INFO]: ${gid} | ${event}`);
    if (message) {
        console.log('> ' + message);
    }
    console.log('==================================================');
}

export async function error(gid: string | undefined, event: string, message?: string) {
    console.log(`[${dayjs().format('YYYY/MM/DD HH:mm:ss')}/ERROR]: ${gid} | ${event}`);
    if (message) {
        console.log('> ' + message);
    }
    console.log('==================================================');
}
