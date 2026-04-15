export interface User {
    id: number;
    name: string;
    email: string;
    account_id: number;
    budget_name: string;
    primary_currency: string;
    api_key_label: string | null;
}

export interface CategoryChild {
    id: number;
    name: string;
    description: string | null;
    is_income: boolean;
    exclude_from_budget: boolean;
    exclude_from_totals: boolean;
    updated_at: string;
    created_at: string;
    group_id: number | null;
    is_group: false;
    archived: boolean;
    archived_at: string | null;
    order: number | null;
    collapsed?: boolean;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    is_income: boolean;
    exclude_from_budget: boolean;
    exclude_from_totals: boolean;
    updated_at: string;
    created_at: string;
    group_id: number | null;
    is_group: boolean;
    archived: boolean;
    archived_at: string | null;
    order: number | null;
    collapsed?: boolean;
    children?: CategoryChild[];
}

export interface DeleteCategoryWithDependencies {
    category_name: string;
    dependents: {
        budget: number;
        category_rules: number;
        transactions: number;
        children: number;
        recurring: number;
        plaid_cats: number;
    };
}

export interface Tag {
    id: number;
    name: string;
    description: string | null;
    text_color: string | null;
    background_color: string | null;
    created_at: string;
    updated_at: string;
    archived: boolean;
    archived_at: string | null;
}

export interface DeleteTagWithDependencies {
    tag_name: string;
    dependents: {
        rules: number;
        transactions: number;
    };
}

export type ManualAccountType =
    | "cash"
    | "credit"
    | "cryptocurrency"
    | "employee compensation"
    | "investment"
    | "loan"
    | "other liability"
    | "other asset"
    | "real estate"
    | "vehicle";

export interface ManualAccount {
    id: number;
    name: string;
    institution_name: string | null;
    display_name: string | null;
    type: ManualAccountType;
    subtype: string | null;
    balance: string;
    currency: string;
    to_base: number;
    balance_as_of: string;
    status: "active" | "closed";
    closed_on: string | null;
    external_id: string | null;
    custom_metadata: Record<string, unknown> | null;
    exclude_from_transactions: boolean;
    created_by_name: string;
    created_at: string;
    updated_at: string;
}

export interface PlaidAccount {
    id: number;
    plaid_item_id: string | null;
    date_linked: string;
    linked_by_name: string;
    name: string;
    display_name: string | null;
    type: string;
    subtype: string;
    mask: string;
    institution_name: string;
    status: string;
    allow_transaction_modifications: boolean;
    limit: number | null;
    balance: string;
    currency: string;
    to_base: number;
    balance_last_update: string | null;
    import_start_date: string | null;
    last_import: string | null;
    last_fetch: string | null;
    plaid_last_successful_update: string | null;
}

export interface TransactionAttachment {
    id: number;
    uploaded_by: number;
    name: string;
    type: string;
    size: number;
    notes: string | null;
    created_at: string;
}

export interface Transaction {
    id: number;
    date: string;
    amount: string;
    currency: string;
    to_base: number;
    recurring_id: number | null;
    payee: string;
    original_name?: string | null;
    category_id: number | null;
    notes: string | null;
    status: "reviewed" | "unreviewed" | "delete_pending";
    is_pending: boolean;
    created_at: string;
    updated_at: string;
    is_split_parent?: boolean;
    split_parent_id: number | null;
    is_group_parent: boolean;
    group_parent_id: number | null;
    manual_account_id: number | null;
    plaid_account_id: number | null;
    tag_ids: number[];
    source: string | null;
    external_id: string | null;
    children?: Transaction[];
    plaid_metadata?: Record<string, unknown> | null;
    custom_metadata?: Record<string, unknown> | null;
    files?: TransactionAttachment[];
}

export interface TransactionsListResponse {
    transactions: Transaction[];
    has_more: boolean;
    error?: string;
}

export interface SkippedDuplicate {
    reason: "duplicate_external_id" | "duplicate_payee_amount_date";
    request_transactions_index: number;
    existing_transaction_id: number;
    request_transaction: Record<string, unknown>;
}

export interface InsertTransactionsResponse {
    transactions: Transaction[];
    skipped_duplicates: SkippedDuplicate[];
}

export interface RecurringMatches {
    request_start_date: string;
    request_end_date: string;
    expected_occurrence_dates: string[];
    found_transactions: { date: string; transaction_id: number }[];
    missing_transaction_dates: string[];
}

export interface RecurringItem {
    id: number;
    description: string | null;
    status: "suggested" | "reviewed";
    transaction_criteria: {
        start_date: string | null;
        end_date: string | null;
        granularity: "day" | "week" | "month" | "year";
        quantity: number;
        anchor_date: string;
        payee: string | null;
        amount: string;
        to_base: number;
        currency: string;
        plaid_account_id: number | null;
        manual_account_id: number | null;
    };
    overrides?: {
        payee?: string;
        notes?: string;
        category_id?: number;
    };
    matches: RecurringMatches | null;
    created_by: number;
    created_at: string;
    updated_at: string;
    source: "manual" | "transaction" | "system" | null;
}

export interface Budget {
    id: number;
    category_id: number;
    amount: number;
    currency: string;
    start_date: string;
    next_start_date: string;
    notes?: string | null;
    auto_budget_type: "nothing" | "fixed" | "spend" | "budget";
    auto_budget_amount?: number | null;
    auto_budget_currency?: string | null;
    rollover_option?: "same category" | "available funds" | null;
    granularity: "month" | "week" | "twice a month";
    quantity: number;
    is_group: boolean;
    group_id?: number | null;
    created_at: string;
    updated_at: string;
}

export interface BudgetUpsertResponse {
    category_id: number;
    start_date: string;
    amount: string;
    currency: string;
    to_base: number;
    notes: string | null;
}

export interface BudgetSettings {
    budget_period_granularity:
        | "day"
        | "week"
        | "month"
        | "year"
        | "twice a month";
    budget_period_quantity: number;
    budget_period_anchor_date: string;
    budget_hide_no_activity: boolean;
    budget_use_last_day_of_month: boolean;
    budget_income_option: "max" | "budgeted" | "activity";
    budget_rollover_left_to_budget: boolean;
}

export interface SummaryCategoryTotals {
    other_activity: number;
    recurring_activity: number;
    budgeted?: number | null;
    available?: number | null;
    recurring_remaining: number;
    recurring_expected: number;
}

export interface SummaryCategoryOccurrence {
    in_range: boolean;
    start_date: string;
    end_date: string;
    other_activity: number;
    recurring_activity: number;
    budgeted: number | null;
    budgeted_amount: string | null;
    budgeted_currency: string | null;
    notes: string | null;
}

export interface SummaryCategory {
    category_id: number;
    totals: SummaryCategoryTotals;
    occurrences?: SummaryCategoryOccurrence[];
    rollover_pool?: SummaryRolloverPool;
}

export interface SummaryRolloverPoolAdjustment {
    in_range: boolean;
    date: string;
    amount: string;
    currency: string;
    to_base: number;
}

export interface SummaryRolloverPool {
    budgeted_to_base: number;
    all_adjustments: SummaryRolloverPoolAdjustment[];
}

export interface SummaryTotals {
    inflow?: SummaryTotalsBreakdown;
    outflow?: SummaryTotalsBreakdown;
}

export interface SummaryTotalsBreakdown {
    other_activity?: number;
    recurring_activity?: number;
    recurring_remaining?: number;
    recurring_expected?: number;
    uncategorized?: number;
    uncategorized_count?: number;
    uncategorized_recurring?: number;
}

export interface SummaryResponse {
    aligned: boolean;
    categories: SummaryCategory[];
    totals?: SummaryTotals;
    rollover_pool?: SummaryRolloverPool | null;
}

export type Asset = ManualAccount;
export type Crypto = ManualAccount;
