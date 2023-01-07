export interface ShopifyProxyQuery {
  shop: string;
  logged_in_customer_id: string;
  path_prefix: string;
  timestamp: number;
  signature: string;
}
