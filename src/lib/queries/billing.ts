import { supabase } from '../supabase';
import type { InstructorInvoice, CreateInvoiceDTO } from '../../types/billing';
import { format } from 'date-fns';

export async function createInstructorInvoice(data: CreateInvoiceDTO): Promise<InstructorInvoice> {
  // Start a transaction
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  try {
    // 1. Get all flights for the period
    const { data: flights, error: flightsError } = await supabase
      .from('flights')
      .select('id, instructor_fee')
      .in('id', data.flight_ids)
      .eq('instructor_id', data.instructor_id)
      .eq('is_validated', true);

    if (flightsError) throw flightsError;
    if (!flights?.length) throw new Error('No validated flights found for this period');

    // 2. Calculate total amount
    const totalAmount = flights.reduce((sum, flight) => sum + (flight.instructor_fee || 0), 0);

    // 3. Generate invoice number (YYYY-MM-XXX format)
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const { data: lastInvoice } = await supabase
      .from('instructor_invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${year}-${month.toString().padStart(2, '0')}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (lastInvoice?.[0]) {
      const lastSequence = parseInt(lastInvoice[0].invoice_number.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const invoiceNumber = `${year}-${month.toString().padStart(2, '0')}-${sequence.toString().padStart(3, '0')}`;

    // 4. Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('instructor_invoices')
      .insert({
        instructor_id: data.instructor_id,
        start_date: data.start_date,
        end_date: data.end_date,
        amount: totalAmount,
        status: 'DRAFT',
        invoice_number: invoiceNumber,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 5. Create invoice details
    const invoiceDetails = flights.map(flight => ({
      invoice_id: invoice.id,
      flight_id: flight.id,
      amount: flight.instructor_fee || 0,
    }));

    const { error: detailsError } = await supabase
      .from('instructor_invoice_details')
      .insert(invoiceDetails);

    if (detailsError) throw detailsError;

    // 6. Mark flights as invoiced
    const { error: updateError } = await supabase
      .from('flights')
      .update({ instructor_invoice_id: invoice.id })
      .in('id', data.flight_ids);

    if (updateError) throw updateError;

    return invoice;
  } catch (error) {
    console.error('Error creating instructor invoice:', error);
    throw error;
  }
}

export async function getInstructorInvoices(instructorId: string) {
  const { data, error } = await supabase
    .from('instructor_invoices')
    .select(`
      *,
      instructor:instructor_id(
        first_name,
        last_name
      )
    `)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getInvoiceDetails(invoiceId: string) {
  const { data, error } = await supabase
    .from('instructor_invoice_details')
    .select(`
      *,
      flight:flight_id(
        *,
        student:user_id(
          first_name,
          last_name
        ),
        aircraft:aircraft_id(
          registration,
          name
        )
      )
    `)
    .eq('invoice_id', invoiceId);

  if (error) throw error;
  return data;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'DRAFT' | 'PENDING' | 'PAID',
  paymentMethod?: string
) {
  const updates: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'PAID') {
    updates.paid_at = new Date().toISOString();
    updates.payment_method = paymentMethod;
  }

  const { error } = await supabase
    .from('instructor_invoices')
    .update(updates)
    .eq('id', invoiceId);

  if (error) throw error;
}

export async function deleteInvoice(invoiceId: string) {
  // First, unlink flights from this invoice
  const { error: updateError } = await supabase
    .from('flights')
    .update({ instructor_invoice_id: null })
    .eq('instructor_invoice_id', invoiceId);

  if (updateError) throw updateError;

  // Then delete invoice details
  const { error: detailsError } = await supabase
    .from('instructor_invoice_details')
    .delete()
    .eq('invoice_id', invoiceId);

  if (detailsError) throw detailsError;

  // Finally delete the invoice
  const { error } = await supabase
    .from('instructor_invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) throw error;
}
