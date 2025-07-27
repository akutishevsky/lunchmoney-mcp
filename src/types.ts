export interface User {
    user_id: number;
    user_name: string;
    user_email: string;
    account_id: number;
    budget_name: string;
    primary_currency: string;
    api_key_label: string | null;
}
