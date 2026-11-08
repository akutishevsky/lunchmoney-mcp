import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    errorResponse,
} from "../api.js";
import {
    currency,
    id,
    locale,
    monthDayFormat,
    monthDayYearFormat,
    monthYearFormat,
    weekStartsOn,
} from "../schemas.js";
import { User } from "../types.js";

export function registerUserTools(server: McpServer) {
    server.registerTool(
        "get_user",
        {
            description: "Get details on the current user",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/me");

                if (!response.ok) {
                    return handleApiError(response, "Failed to get user");
                }

                const user: User = await response.json();

                return dataResponse(user);
            } catch (error) {
                return catchError(error, "Failed to get user");
            }
        },
    );

    server.registerTool(
        "get_account_settings",
        {
            description:
                "Get account-wide settings for the current budget account: primary and supported currencies, display name, locale, and rule/totals preferences. These apply regardless of which user accesses the account.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/me/account/settings");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get account settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get account settings");
            }
        },
    );

    server.registerTool(
        "update_account_settings",
        {
            description:
                "Update account-wide settings for the current budget account. At least one field must be provided; omitted fields are left unchanged. Returns the full account settings.",
            inputSchema: {
                primary_currency: currency
                    .optional()
                    .describe(
                        "Primary currency for the budget account. Three-letter currency code (e.g. usd).",
                    ),
                supported_currencies: z
                    .array(currency)
                    .optional()
                    .describe(
                        "Currencies available when creating or editing transactions, balances, and other amounts. Replaces the existing list.",
                    ),
                display_name: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "Display name of the budget account in the Lunch Money app. Pass null to clear it.",
                    ),
                locale: locale
                    .optional()
                    .describe(
                        "Locale used for formatting numbers and currency amounts (e.g. en-US). Date presentation is set with update_user_settings.",
                    ),
                auto_create_category_rules: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, category rules are created automatically when categorizing transactions.",
                    ),
                auto_create_suggested_transaction_rules: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, suggested transaction rules are created automatically.",
                    ),
                include_pending_in_totals: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, pending transactions are included in account totals.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            primary_currency,
            supported_currencies,
            display_name,
            locale,
            auto_create_category_rules,
            auto_create_suggested_transaction_rules,
            include_pending_in_totals,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (primary_currency !== undefined)
                    body.primary_currency = primary_currency;
                if (supported_currencies !== undefined)
                    body.supported_currencies = supported_currencies;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (locale !== undefined) body.locale = locale;
                if (auto_create_category_rules !== undefined)
                    body.auto_create_category_rules =
                        auto_create_category_rules;
                if (auto_create_suggested_transaction_rules !== undefined)
                    body.auto_create_suggested_transaction_rules =
                        auto_create_suggested_transaction_rules;
                if (include_pending_in_totals !== undefined)
                    body.include_pending_in_totals = include_pending_in_totals;

                if (Object.keys(body).length === 0) {
                    return errorResponse(
                        "Failed to update account settings: at least one property must be provided: primary_currency, supported_currencies, display_name, locale, auto_create_category_rules, auto_create_suggested_transaction_rules, include_pending_in_totals.",
                    );
                }

                const response = await api.put("/me/account/settings", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update account settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update account settings");
            }
        },
    );

    server.registerTool(
        "get_user_settings",
        {
            description:
                "Get user-wide display and formatting preferences for the authorized user: debit sign display, payee suggestions, date and time formats, week start, and year/weekday display. These apply across every budget account the user can access.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/me/user/settings");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get user settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get user settings");
            }
        },
    );

    server.registerTool(
        "update_user_settings",
        {
            description:
                "Update user-wide display and formatting preferences for the authorized user. At least one field must be provided; omitted fields are left unchanged. show_debits_as_negative only changes display in the Lunch Money app: amounts in API responses always use positive values for debits and negative values for credits. Returns the full user settings.",
            inputSchema: {
                show_debits_as_negative: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, debits are shown as negative values and credits as positive in the Lunch Money app. Display only; API amount signs are unchanged.",
                    ),
                auto_suggest_payee: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, payee suggestions are shown when entering transactions in the Lunch Money app.",
                    ),
                month_year_format: monthYearFormat
                    .optional()
                    .describe(
                        "Format string for displaying month and year values (e.g. MMM YYYY).",
                    ),
                month_day_year_format: monthDayYearFormat
                    .optional()
                    .describe(
                        "Format string for displaying full dates with month, day, and year (e.g. MMM D, YYYY).",
                    ),
                month_day_format: monthDayFormat
                    .optional()
                    .describe(
                        "Format string for displaying month and day without a year (e.g. MMM D).",
                    ),
                show_am_pm: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, times use a 12-hour clock with AM/PM. If false, a 24-hour clock.",
                    ),
                week_starts_on: weekStartsOn
                    .optional()
                    .describe("The day on which a calendar week begins."),
                always_display_year: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, dates always include the year and month_day_format is not used.",
                    ),
                always_display_weekday: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, weekday names are included when displaying dates.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            show_debits_as_negative,
            auto_suggest_payee,
            month_year_format,
            month_day_year_format,
            month_day_format,
            show_am_pm,
            week_starts_on,
            always_display_year,
            always_display_weekday,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (show_debits_as_negative !== undefined)
                    body.show_debits_as_negative = show_debits_as_negative;
                if (auto_suggest_payee !== undefined)
                    body.auto_suggest_payee = auto_suggest_payee;
                if (month_year_format !== undefined)
                    body.month_year_format = month_year_format;
                if (month_day_year_format !== undefined)
                    body.month_day_year_format = month_day_year_format;
                if (month_day_format !== undefined)
                    body.month_day_format = month_day_format;
                if (show_am_pm !== undefined) body.show_am_pm = show_am_pm;
                if (week_starts_on !== undefined)
                    body.week_starts_on = week_starts_on;
                if (always_display_year !== undefined)
                    body.always_display_year = always_display_year;
                if (always_display_weekday !== undefined)
                    body.always_display_weekday = always_display_weekday;

                if (Object.keys(body).length === 0) {
                    return errorResponse(
                        "Failed to update user settings: at least one property must be provided: show_debits_as_negative, auto_suggest_payee, month_year_format, month_day_year_format, month_day_format, show_am_pm, week_starts_on, always_display_year, always_display_weekday.",
                    );
                }

                const response = await api.put("/me/user/settings", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update user settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update user settings");
            }
        },
    );

    server.registerTool(
        "get_user_account_settings",
        {
            description:
                "Get settings specific to the authorized user within the current budget account: transaction review behavior and the default manual account for new manual transactions. These do not affect other users or the user's settings in other budget accounts.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/me/user/account/settings");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get user account settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get user account settings");
            }
        },
    );

    server.registerTool(
        "update_user_account_settings",
        {
            description:
                "Update settings specific to the authorized user within the current budget account. At least one field must be provided; omitted fields are left unchanged. Returns the full user account settings.",
            inputSchema: {
                auto_review_transaction_on_update: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, transactions are marked as reviewed when their date, category, payee, amount, account, or notes are changed.",
                    ),
                auto_review_transaction_on_creation: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, new manual transactions start as reviewed. If false, they start as unreviewed.",
                    ),
                default_manual_account_id: id
                    .nullable()
                    .optional()
                    .describe(
                        "Manual account selected by default when creating a manual transaction in the current budget account. Must be an ID from get_all_manual_accounts. Pass null to clear the selection.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            auto_review_transaction_on_update,
            auto_review_transaction_on_creation,
            default_manual_account_id,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (auto_review_transaction_on_update !== undefined)
                    body.auto_review_transaction_on_update =
                        auto_review_transaction_on_update;
                if (auto_review_transaction_on_creation !== undefined)
                    body.auto_review_transaction_on_creation =
                        auto_review_transaction_on_creation;
                if (default_manual_account_id !== undefined)
                    body.default_manual_account_id = default_manual_account_id;

                if (Object.keys(body).length === 0) {
                    return errorResponse(
                        "Failed to update user account settings: at least one property must be provided: auto_review_transaction_on_update, auto_review_transaction_on_creation, default_manual_account_id.",
                    );
                }

                const response = await api.put(
                    "/me/user/account/settings",
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update user account settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to update user account settings",
                );
            }
        },
    );
}
