
export interface InstructorInvoice {
  id: string;
  instructor_id: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'PAID';
  invoice_number: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  payment_method?: string;
  comments?: string;
}

export interface InstructorInvoiceDetail {
  id: string;
  invoice_id: string;
  flight_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceDTO {
  instructor_id: string;
  start_date: string;
  end_date: string;
  flight_ids: string[];
}
