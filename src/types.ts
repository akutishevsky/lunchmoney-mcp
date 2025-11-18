export interface User {
    id: number;
    name: string;
    email: string;
    account_id: number;
    budget_name: string;
    primary_currency: string;
    api_key_label: string | null;
    debits_as_negative?: boolean;
}

export interface CategoryChild {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    description?: string | null;
    is_income: boolean;
    exclude_from_budget: boolean;
    exclude_from_totals: boolean;
    archived: boolean | null;
    archived_on: string | null;
    updated_at: string | null;
    created_at: string | null;
    is_group: boolean;
    group_id: number | null;
    order: number | null;
    children?: CategoryChild[] | null;
    group_category_name?: string | null;
}

export interface Tag {
    id: number;
    name: string;
    description: string | null;
    archived: boolean;
    created_at: string;
    updated_at: string;
    archived_at: string | null;
}

export interface Transaction {
    id: number;
    date: string;
    payee: string;
    amount: string;
    currency: string;
    to_base: number;
    category_id: number | null;
    is_income: boolean;
    exclude_from_budget: boolean;
    exclude_from_totals: boolean;
    created_at: string;
    updated_at: string;
    status: string | null;
    is_pending: boolean;
    notes: string | null;
    original_name: string | null;
    recurring_id: number | null;
    parent_id: number | null;
    is_parent: boolean;
    group_id: number | null;
    is_group: boolean;
    manual_account_id: number | null;
    plaid_account_id: number | null;
    type: string | null;
    subtype: string | null;
    fees: string | null;
    price: string | null;
    quantity: string | null;
    external_id: string | null;
    tag_ids: number[];
}

export interface SummarizedTransaction {
    id: number;
    date: string;
    amount: string;
    currency: string;
    payee: string;
    category_id: number | null;
    recurring_id: number | null;
    to_base: number;
}

export interface RecurringItem {
    id: number;
    start_date: string | null;
    end_date: string | null;
    payee: string;
    currency: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    transaction_criteria: {
        billing_date: string;
        original_name: string | null;
        description: string | null;
        plaid_account_id: number | null;
        manual_account_id: number | null;
    };
    overrides: {
        source: string;
        notes: string | null;
        amount: number;
        category_id: number | null;
        is_income: boolean;
        exclude_from_totals: boolean;
    };
    matches: {
        granularity: string;
        quantity: number | null;
        occurrences: any;
        transactions_within_range: SummarizedTransaction[] | null;
        missing_dates_within_range: string[] | null;
    };
    to_base: number;
}

export interface BudgetConfig {
    config_id: number;
    cadence: string;
    amount: number;
    currency: string;
    to_base: number;
    auto_suggest: string;
}

export interface BudgetData {
    budget_amount: number | null;
    budget_currency: string | null;
    budget_to_base: number | null;
    spending_to_base: number;
    num_transactions: number;
    is_automated: boolean | null;
}

export interface Budget {
    category_name: string;
    category_id: number | null;
    category_group_name: string | null;
    group_id: number | null;
    is_group: boolean | null;
    is_income: boolean;
    exclude_from_budget: boolean;
    exclude_from_totals: boolean;
    data: BudgetData[];
    config: BudgetConfig | null;
    order: number;
    archived: boolean;
    recurring: any | null;
}

export interface ManualAccount {
    id: number;
    type: string;
    subtype: string | null;
    name: string;
    display_name: string | null;
    balance: string;
    to_base: number | null;
    balance_as_of: string;
    closed_on: string | null;
    currency: string;
    institution_name: string | null;
    exclude_transactions: boolean;
    created_at: string;
    updated_at: string;
    external_id: string | null;
    custom_metadata: any | null;
}

export interface PlaidAccount {
    id: number;
    date_linked: string;
    name: string;
    display_name: string;
    type: string;
    subtype: string | null;
    mask: string;
    institution_name: string;
    status: string;
    balance: string;
    to_base: number | null;
    currency: string;
    balance_last_update: string;
    limit: number | null;
    import_start_date: string | null;
    last_import: string | null;
    last_fetch: string | null;
    plaid_last_successful_update: string;
    allow_transaction_modification: boolean;
}

export interface Crypto {
    id: number;
    name: string;
    symbol: string;
    balance: string;
    to_base: number;
    currency: string;
    created_at: string;
}
