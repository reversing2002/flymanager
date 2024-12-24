import { supabase } from "../supabase";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface Invoice {
  id: string;
  club_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  commission_amount: number;
  status: 'pending' | 'sent' | 'paid';
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  club?: {
    name: string;
    code: string;
  };
}

export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      club:clubs (
        name,
        code
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Invoice[];
}

export async function generateInvoicePdf(invoice: Invoice) {
  try {
    // Générer le PDF
    const pdfContent = {
      content: [
        {
          text: 'FACTURE',
          style: 'header'
        },
        {
          text: `Club: ${invoice.club?.name}`,
          style: 'subheader'
        },
        {
          text: `Période: ${format(new Date(invoice.period_start), 'MMMM yyyy', { locale: fr })}`,
          style: 'subheader'
        },
        {
          text: `Montant total: ${invoice.total_amount.toFixed(2)}€`,
          style: 'amount'
        },
        {
          text: `Commission: ${invoice.commission_amount.toFixed(2)}€`,
          style: 'amount'
        }
      ],
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 16,
          margin: [0, 5, 0, 5]
        },
        amount: {
          fontSize: 14,
          margin: [0, 2, 0, 2]
        }
      }
    };

    // Créer un nom de fichier unique
    const fileName = `factures/${invoice.club?.code || 'no-club'}/${format(
      new Date(invoice.period_start),
      'yyyy-MM'
    )}-${invoice.id.slice(0, 8)}.pdf`;

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfContent, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) throw error;

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Mettre à jour l'URL du PDF dans la facture
    await supabase
      .from('invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoice.id);

    return publicUrl;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
}

export async function generateManualInvoice(clubId: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Calculer les totaux pour la période
    const { data: totals, error: totalsError } = await supabase.rpc(
      'calculate_club_totals',
      {
        p_club_id: clubId,
        p_start_date: startOfMonth.toISOString(),
        p_end_date: endOfMonth.toISOString()
      }
    );

    if (totalsError) throw totalsError;

    // Créer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        club_id: clubId,
        period_start: startOfMonth.toISOString(),
        period_end: endOfMonth.toISOString(),
        total_amount: totals.total_amount || 0,
        commission_amount: totals.commission_amount || 0,
        status: 'pending'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    return invoice;
  } catch (error) {
    console.error('Erreur lors de la génération de la facture:', error);
    throw error;
  }
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']) {
  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}
