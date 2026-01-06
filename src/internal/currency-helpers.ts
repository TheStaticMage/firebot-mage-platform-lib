import { firebot } from '../main';

export type CurrencyLookupResult = {
    currencyId: string | null;
    found: boolean;
};

export function resolveCurrencyId(currencyIdOrName: string): CurrencyLookupResult {
    const { currencyAccess } = firebot.modules as unknown as {
        currencyAccess: {
            getCurrencyById: (id: string) => { id: string } | null;
            getCurrencyByName: (name: string) => { id: string } | null;
        };
    };

    let currencyId = currencyIdOrName;
    let currency = currencyAccess.getCurrencyById(currencyIdOrName);
    if (!currency) {
        currency = currencyAccess.getCurrencyByName(currencyIdOrName);
        if (currency) {
            currencyId = currency.id;
        }
    }

    return {
        currencyId: currency ? currencyId : null,
        found: Boolean(currency)
    };
}
