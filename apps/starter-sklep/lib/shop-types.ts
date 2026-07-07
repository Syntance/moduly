/** Minimalne typy wspĂłĹ‚dzielone checkoutu (zamiennik @lumine/types). */
export interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  company?: string;
}
