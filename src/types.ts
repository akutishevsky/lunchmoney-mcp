export interface User {
    user_id: number;
    user_name: string;
    user_email: string;
    account_id: number;
    budget_name: string;
    primary_currency: string;
    api_key_label: string | null;
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
}

export interface Transaction {
    id: number;
    date: string;
    payee: string;
    amount: string;
    currency: string;
    to_base: number;
    category_id: number | null;
    category_name: string | null;
    category_group_id: number | null;
    category_group_name: string | null;
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
    recurring_payee: string | null;
    recurring_description: string | null;
    recurring_cadence: string | null;
    recurring_type: string | null;
    recurring_amount: string | null;
    recurring_currency: string | null;
    parent_id: number | null;
    has_children: boolean;
    group_id: number | null;
    is_group: boolean;
    asset_id: number | null;
    asset_institution_name: string | null;
    asset_name: string | null;
    asset_display_name: string | null;
    asset_status: string | null;
    plaid_account_id: number | null;
    plaid_account_name: string | null;
    plaid_account_mask: string | null;
    plaid_account_display_name: string | null;
    institution_name: string | null;
    plaid_account_type: string | null;
    plaid_account_subtype: string | null;
    plaid_metadata?: any | null;
    type: string | null;
    subtype: string | null;
    fees: string | null;
    price: string | null;
    quantity: string | null;
    external_id: string | null;
    tags: Tag[];
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
    billing_date: string;
    original_name: string | null;
    description: string | null;
    plaid_account_id: number | null;
    asset_id: number | null;
    source: string;
    notes: string | null;
    amount: number;
    category_id: number | null;
    category_group_id: number | null;
    is_income: boolean;
    exclude_from_totals: boolean;
    granularity: string;
    quantity: number | null;
    occurrences: any;
    transactions_within_range: SummarizedTransaction[] | null;
    missing_dates_within_range: string[] | null;
    date: string | null;
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
