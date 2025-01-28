export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  optional: boolean;
  type: 'product' | 'pack';
  items?: ProductItem[];
}

export interface ProductItem {
  id: number;
  product_id: number;
  pack_id: number;
  quantity: number;
}

export interface NewProduct {
  name: string;
  price: number;
  description?: string;
  optional: boolean;
  type: 'product' | 'pack';
}
