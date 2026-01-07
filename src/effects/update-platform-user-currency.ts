import type { Effects } from '@crowbartools/firebot-custom-scripts-types/types/effects';
import { resolvePlatformForEffect } from '../internal/effect-helpers';
import { extractTriggerUserId } from '../internal/trigger-helpers';
import { firebot, logger, platformLib } from '../main';

interface UpdatePlatformUserCurrencyEffectModel {
    platform: 'auto-detect' | 'twitch' | 'kick' | 'youtube';
    action: 'Add' | 'Remove' | 'Set';
    target: 'individual' | 'allViewers';
    username: string;
    currency: string;
    amount: number;
}

export const updatePlatformUserCurrencyEffect: Effects.EffectType<UpdatePlatformUserCurrencyEffectModel> = {
    definition: {
        id: 'mage-platform-lib:update-platform-user-currency',
        name: 'Update Platform User Currency',
        description: 'Updates currency for a user on Twitch, Kick, or YouTube based on detected platform',
        icon: 'fad fa-coins',
        categories: ['advanced']
    },
    optionsTemplate: `
        <eos-container header="Platform">
            <dropdown-select options="platformOptions" selected="effect.platform"></dropdown-select>
        </eos-container>

        <p class="muted" style="margin: 10px 0 0 10px;" ng-if="effect.platform === 'auto-detect'">
            Auto-detect will identify the platform from the username suffix, falling back to trigger metadata. For existing users, it looks up by username in the database. For new users, it requires the userId to be present in trigger metadata.
        </p>

        <eos-container header="Currency" pad-top="true">
            <div class="btn-group">
                <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <span class="currency-name">{{effect.currency ? getCurrencyName(effect.currency) : 'Pick one'}}</span> <span class="caret"></span>
                </button>
                <ul class="dropdown-menu currency-name-dropdown">
                    <li ng-repeat="currency in currencies" ng-click="effect.currency = currency.id">
                        <a href>{{getCurrencyName(currency.id)}}</a>
                    </li>
                </ul>
            </div>
        </eos-container>

        <div ng-if="effect.currency">
            <eos-container header="Operation" pad-top="true">
                <div class="btn-group">
                    <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <span class="currency-action">{{effect.action ? effect.action : 'Pick one'}}</span> <span class="caret"></span>
                    </button>
                    <ul class="dropdown-menu currency-action-dropdown">
                        <li ng-click="effect.action = 'Add'">
                            <a href>Add</a>
                        </li>
                        <li ng-click="effect.action = 'Remove'">
                            <a href>Remove</a>
                        </li>
                        <li ng-click="effect.action = 'Set'">
                            <a href>Set</a>
                        </li>
                    </ul>
                </div>
            </eos-container>

            <div ng-if="effect.action">
                <eos-container header="Target" pad-top="true">
                    <div class="permission-type controls-fb">
                        <label class="control-fb control--radio">Single User
                            <input type="radio" ng-model="effect.target" value="individual"/>
                            <div class="control__indicator"></div>
                        </label>
                        <label class="control-fb control--radio">All Viewers
                            <input type="radio" ng-model="effect.target" value="allViewers"/>
                            <div class="control__indicator"></div>
                        </label>
                    </div>

                    <div class="settings-permission" style="padding-bottom:1em" ng-if="effect.target === 'individual'">
                        <div class="input-group">
                            <span class="input-group-addon" id="basic-addon3">Username</span>
                            <input type="text" class="form-control" aria-describedby="basic-addon3" ng-model="effect.username" replace-variables>
                        </div>
                    </div>
                </eos-container>

                <p class="muted" style="margin: 10px 0 0 10px;" ng-if="effect.platform === 'auto-detect' && effect.target === 'allViewers'">
                    Auto-detect for all users relies on trigger metadata. If no platform metadata is available, the effect will fail.
                </p>

                <eos-container header="Amount" ng-if="effect.target != null" pad-top="true">
                    <div class="input-group">
                        <span class="input-group-addon" id="currency-units-type">Amount</span>
                        <input type="text" ng-model="effect.amount" class="form-control" id="currency-units-setting" aria-describedby="currency-units-type" type="text" replace-variables="number">
                    </div>
                </eos-container>
            </div>
        </div>
    `,
    optionsController: ($scope: any, backendCommunicator: any, currencyService: any) => {
        $scope.platformOptions = {
            'auto-detect': 'Auto-detect',
            twitch: 'Twitch'
        };

        const response = backendCommunicator.fireEventSync('platform-lib:get-available-platforms');
        if (response && response.platforms) {
            if (response.platforms.includes('kick')) {
                $scope.platformOptions.kick = 'Kick';
            }
            if (response.platforms.includes('youtube')) {
                $scope.platformOptions.youtube = 'YouTube';
            }
        }

        $scope.currencies = currencyService.getCurrencies();
        $scope.getCurrencyName = function (currencyId: string) {
            const currency = currencyService.getCurrency(currencyId);
            return currency ? currency.name : 'Unknown Currency';
        };

        $scope.effect.platform = $scope.effect.platform || 'auto-detect';
        $scope.effect.action = $scope.effect.action || '';
        $scope.effect.target = $scope.effect.target || '';
        $scope.effect.username = $scope.effect.username || '';
        $scope.effect.amount = $scope.effect.amount ?? 0;
    },
    optionsValidator: (effect) => {
        const errors = [];
        if (!effect.platform) {
            errors.push('Platform is required');
        }
        if (!effect.action) {
            errors.push('Action is required');
        }
        if (!effect.target) {
            errors.push('Target is required');
        }
        if (effect.target === 'individual' && !effect.username) {
            errors.push('Username is required');
        }
        if (!effect.currency) {
            errors.push('Please select a currency to use');
        }
        if (effect.amount === undefined || effect.amount === null) {
            errors.push('Amount is required');
        }
        return errors;
    },
    getDefaultLabel: (effect, currencyService) => {
        if (
            effect.platform == null ||
            effect.action == null ||
            effect.target == null ||
            effect.currency == null ||
            effect.amount == null ||
            String(effect.amount).trim() === ''
        ) {
            return '';
        }

        const currencyName = currencyService.getCurrency(effect.currency)?.name ?? 'Unknown Currency';
        const platformDisplay = effect.platform === 'auto-detect'
            ? 'Auto-detect'
            : effect.platform.charAt(0).toUpperCase() + effect.platform.slice(1);
        const subject = effect.target === 'allViewers' ? 'All Users' : effect.username;

        switch (effect.action) {
            case 'Add':
                return `Give ${effect.amount} ${currencyName} to ${subject} (${platformDisplay})`;
            case 'Remove':
                return `Remove ${effect.amount} ${currencyName} from ${subject} (${platformDisplay})`;
            case 'Set':
                return `Set ${currencyName} to ${effect.amount} for ${subject} (${platformDisplay})`;
        }
    },
    onTriggerEvent: async (event) => {
        const { effect } = event;

        try {
            let platform: string = effect.platform;
            const action = effect.action;
            const target = effect.target;
            const username = typeof effect.username === 'string' ? effect.username.trim() : '';
            const currencyId = effect.currency;
            const amount = parseFloat(String(effect.amount));

            if (!currencyId || !action || !target) {
                logger.error('Update Platform User Currency: Invalid required parameters');
                return false;
            }
            if (target === 'individual' && !username) {
                logger.error('Update Platform User Currency: Username is required for single-user targets');
                return false;
            }
            if (isNaN(amount) || !isFinite(amount)) {
                logger.error(`Update Platform User Currency: Amount must be a valid, finite number: ${effect.amount}`);
                return false;
            }

            const normalizedAmount = Math.abs(amount);
            const currencyDelta = action === 'Remove' ? -normalizedAmount : normalizedAmount;
            const adjustType = action === 'Set' ? 'set' : 'adjust';

            const detectedPlatform = await resolvePlatformForEffect(platform, username, event.trigger, 'Update Platform User Currency');
            if (!detectedPlatform) {
                return false;
            }

            platform = detectedPlatform;

            if (platform === 'twitch') {
                return await handleTwitchCurrency(target, username, currencyId, currencyDelta, adjustType);
            }

            if (platform !== 'kick' && platform !== 'youtube') {
                logger.error(`Update Platform User Currency: Platform ${platform} not supported by platform-lib`);
                return false;
            }

            if (target === 'allViewers') {
                await platformLib.userDatabase.adjustCurrencyForAllUsers(platform, currencyId, currencyDelta, adjustType);
                logger.debug(`Currency update for all ${platform} users: ${currencyId}=${currencyDelta} (${adjustType})`);
                return true;
            }

            const existingUser = await platformLib.userDatabase.getUserByUsername(username, platform);
            if (!existingUser) {
                const triggerUserId = extractTriggerUserId(event.trigger);
                if (!triggerUserId) {
                    logger.error(`Update Platform User Currency: User not found and no trigger userId available: ${username}`);
                    return false;
                }

                const trimmedUserId = triggerUserId.trim();
                if (trimmedUserId === '' || triggerUserId !== trimmedUserId) {
                    logger.error(`Update Platform User Currency: Trigger userId is empty or contains whitespace: "${triggerUserId}"`);
                    return false;
                }
                if (!trimmedUserId.startsWith('k') && !trimmedUserId.startsWith('y')) {
                    logger.error(`Update Platform User Currency: Trigger userId must be prefixed with k or y: ${trimmedUserId}`);
                    return false;
                }

                const createdUser = await platformLib.userDatabase.getOrCreateUser(
                    platform,
                    trimmedUserId,
                    username
                );

                if (adjustType === 'set') {
                    const clampedAmount = platformLib.userDatabase.clampCurrency(normalizedAmount, currencyId);
                    await platformLib.userDatabase.setUserCurrency(platform, createdUser._id, currencyId, clampedAmount);
                } else {
                    const currentAmount = await platformLib.userDatabase.getUserCurrency(platform, createdUser._id, currencyId);
                    const nextAmount = currentAmount + currencyDelta;
                    const clampedAmount = platformLib.userDatabase.clampCurrency(nextAmount, currencyId);
                    await platformLib.userDatabase.setUserCurrency(platform, createdUser._id, currencyId, clampedAmount);
                }
                return true;
            }

            if (adjustType === 'set') {
                const clampedAmount = platformLib.userDatabase.clampCurrency(normalizedAmount, currencyId);
                await platformLib.userDatabase.setUserCurrency(platform, existingUser._id, currencyId, clampedAmount);
            } else {
                const currentAmount = await platformLib.userDatabase.getUserCurrency(platform, existingUser._id, currencyId);
                const nextAmount = currentAmount + currencyDelta;
                const clampedAmount = platformLib.userDatabase.clampCurrency(nextAmount, currencyId);
                await platformLib.userDatabase.setUserCurrency(platform, existingUser._id, currencyId, clampedAmount);
            }

            logger.debug(`Currency update for ${platform} user ${username}: ${currencyId}=${currencyDelta} (${adjustType})`);
            return true;
        } catch (error) {
            logger.error(`Failed to update platform user currency: ${error}`);
            return false;
        }
    }
};

async function handleTwitchCurrency(
    target: string,
    username: string,
    currencyId: string,
    currencyDelta: number,
    adjustType: 'adjust' | 'set'
): Promise<boolean> {
    const { currencyManagerNew } = firebot.modules as unknown as {
        currencyManagerNew: {
            adjustCurrencyForViewer: (
                username: string,
                currencyId: string,
                amount: number,
                adjustType: 'adjust' | 'set'
            ) => Promise<boolean>;
            adjustCurrencyForAllViewers: (
                currencyId: string,
                amount: number,
                ignoreDisable: boolean,
                adjustType: 'adjust' | 'set'
            ) => Promise<void>;
        };
    };

    if (target === 'individual') {
        await currencyManagerNew.adjustCurrencyForViewer(username, currencyId, currencyDelta, adjustType);
        logger.debug(`Currency update for Twitch user ${username}: ${currencyId}=${currencyDelta} (${adjustType})`);
        return true;
    }
    if (target === 'allViewers') {
        await currencyManagerNew.adjustCurrencyForAllViewers(currencyId, currencyDelta, true, adjustType);
        logger.debug(`Currency update for all Twitch users: ${currencyId}=${currencyDelta} (${adjustType})`);
        return true;
    }
    logger.error(`Update Platform User Currency: Unsupported target ${target} for Twitch`);
    return false;
}
