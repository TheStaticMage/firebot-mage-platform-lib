import { ScriptModules } from '@crowbartools/firebot-custom-scripts-types/types';
import { IntegrationConstants } from "../constants";
import { LogWrapper } from "../main";
import { platformLib } from "../main";

export function registerRoutes(modules: ScriptModules, logger: LogWrapper) {
    const { httpServer } = modules;

    // Ping endpoint (health check)
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "ping",
        "GET",
        async (req, res) => {
            try {
                res.json({ success: true, message: "OK" });
            } catch (error) {
                logger.error(`ping operation failed: ${error}`);
                res.status(500).json({ success: false, error: String(error) });
            }
        }
    );

    // GET /users/by-id - Lookup user by platform-prefixed ID
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/by-id",
        "GET",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId } = req.query;

                if (!platform || !userId) {
                    res.status(400).json({
                        success: false,
                        error: 'platform and userId are required'
                    });
                    return;
                }

                const user = await platformLib.userDatabase.getUser(
                    platform as string,
                    userId as string
                );

                res.json({ success: true, user: user || undefined });
            } catch (error) {
                logger.error(`users/by-id operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // GET /users/by-username - Lookup user by username
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/by-username",
        "GET",
        async (req, res): Promise<void> => {
            try {
                const { username, platform } = req.query;

                if (!username) {
                    res.status(400).json({
                        success: false,
                        error: 'username is required'
                    });
                    return;
                }

                const user = await platformLib.userDatabase.getUserByUsername(
                    username as string,
                    platform ? (platform as string) : undefined
                );

                res.json({ success: true, user: user || undefined });
            } catch (error) {
                logger.error(`users/by-username operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/get-or-create - Get existing user or create new
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/get-or-create",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, username, displayName, profilePicUrl } = req.body;

                if (!platform || !userId || !username) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and username are required'
                    });
                    return;
                }

                const existingUser = await platformLib.userDatabase.getUser(
                    platform as string,
                    userId as string
                );

                if (existingUser) {
                    res.json({ success: true, user: existingUser, created: false });
                    return;
                }

                const user = await platformLib.userDatabase.getOrCreateUser(
                    platform as string,
                    userId as string,
                    username as string,
                    displayName as string | undefined,
                    profilePicUrl as string | undefined
                );

                res.json({ success: true, user, created: true });
            } catch (error) {
                logger.error(`users/get-or-create operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/metadata/set - Set a metadata field value
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/metadata/set",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, key, value } = req.body;

                if (!platform || !userId || !key) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and key are required'
                    });
                    return;
                }

                await platformLib.userDatabase.setUserMetadata(
                    platform as string,
                    userId as string,
                    key as string,
                    value
                );

                res.json({ success: true });
            } catch (error) {
                logger.error(`users/metadata/set operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/metadata/increment - Increment a numeric metadata field
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/metadata/increment",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, key, amount } = req.body;

                if (!platform || !userId || !key || amount === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, key, and amount are required'
                    });
                    return;
                }

                const newValue = await platformLib.userDatabase.incrementUserMetadata(
                    platform as string,
                    userId as string,
                    key as string,
                    amount as number
                );

                res.json({ success: true, newValue });
            } catch (error) {
                logger.error(`users/metadata/increment operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/update-last-seen - Update lastSeen timestamp
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/update-last-seen",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId } = req.body;

                if (!platform || !userId) {
                    res.status(400).json({
                        success: false,
                        error: 'platform and userId are required'
                    });
                    return;
                }

                await platformLib.userDatabase.updateLastSeen(
                    platform as string,
                    userId as string
                );

                res.json({ success: true });
            } catch (error) {
                logger.error(`users/update-last-seen operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/chat-messages/set - Set chat messages count
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/chat-messages/set",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, count } = req.body;

                if (!platform || !userId || count === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and count are required'
                    });
                    return;
                }

                await platformLib.userDatabase.setChatMessages(
                    platform as string,
                    userId as string,
                    count as number
                );

                res.json({ success: true });
            } catch (error) {
                logger.error(`users/chat-messages/set operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/chat-messages/increment - Increment chat messages count
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/chat-messages/increment",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, amount } = req.body;

                if (!platform || !userId || amount === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and amount are required'
                    });
                    return;
                }

                const newValue = await platformLib.userDatabase.incrementChatMessages(
                    platform as string,
                    userId as string,
                    amount as number
                );

                res.json({ success: true, newValue });
            } catch (error) {
                logger.error(`users/chat-messages/increment operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/minutes-in-channel/set - Set minutes in channel
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/minutes-in-channel/set",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, minutes } = req.body;

                if (!platform || !userId || minutes === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and minutes are required'
                    });
                    return;
                }

                await platformLib.userDatabase.setMinutesInChannel(
                    platform as string,
                    userId as string,
                    minutes as number
                );

                res.json({ success: true });
            } catch (error) {
                logger.error(`users/minutes-in-channel/set operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    // POST /users/minutes-in-channel/increment - Increment minutes in channel
    httpServer.registerCustomRoute(
        IntegrationConstants.INTEGRATION_URI,
        "users/minutes-in-channel/increment",
        "POST",
        async (req, res): Promise<void> => {
            try {
                const { platform, userId, amount } = req.body;

                if (!platform || !userId || amount === undefined) {
                    res.status(400).json({
                        success: false,
                        error: 'platform, userId, and amount are required'
                    });
                    return;
                }

                const newValue = await platformLib.userDatabase.incrementMinutesInChannel(
                    platform as string,
                    userId as string,
                    amount as number
                );

                res.json({ success: true, newValue });
            } catch (error) {
                logger.error(`users/minutes-in-channel/increment operation failed: ${error}`);
                res.status(500).json({
                    success: false,
                    error: String(error)
                });
            }
        }
    );

    logger.debug("Platform-lib HTTP endpoint handlers registered successfully.");
}

export function unregisterRoutes(modules: ScriptModules, logger: LogWrapper) {
    const { httpServer } = modules;

    // Unregister all endpoints
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "ping", "GET");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/by-id", "GET");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/by-username", "GET");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/get-or-create", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/metadata/set", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/metadata/increment", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/update-last-seen", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/chat-messages/set", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/chat-messages/increment", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/minutes-in-channel/set", "POST");
    httpServer.unregisterCustomRoute(IntegrationConstants.INTEGRATION_URI, "users/minutes-in-channel/increment", "POST");

    logger.debug("Platform-lib HTTP endpoint handlers unregistered successfully.");
}
