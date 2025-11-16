export function kickifyUserId(userId: string | number | undefined): string {
    if (userId === undefined || userId === null) {
        return "";
    }
    return String(userId).startsWith("k") ? String(userId) : `k${userId}`;
}

export function unkickifyUserId(userId: string | number | undefined): string {
    if (userId === undefined || userId === null) {
        return "";
    }
    return String(userId).startsWith("k") ? String(userId).substring(1) : String(userId);
}

export function kickifyUsername(username: string | undefined): string {
    if (!username) {
        return "";
    }
    let result = username.endsWith("@kick") ? username : `${username}@kick`;
    if (result.startsWith("@")) {
        result = result.substring(1);
    }
    return result;
}

export function unkickifyUsername(username: string | undefined): string {
    if (!username) {
        return "";
    }
    let result = username.endsWith("@kick") ? username.substring(0, username.length - 5) : username;
    if (result.startsWith("@")) {
        result = result.substring(1);
    }
    return result;
}
