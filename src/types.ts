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
