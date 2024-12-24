import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Invoice } from '../queries/invoices';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

export async function generateInvoicePdf(invoice: Invoice): Promise<Blob> {
  const formatDate = (date: string) => format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  
  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'FACTURE', style: 'header' },
              { text: `N° ${invoice.id.slice(0, 8).toUpperCase()}`, style: 'invoiceNumber' },
              { text: `Date: ${formatDate(invoice.created_at)}`, style: 'date' }
            ]
          },
          {
            width: 'auto',
            stack: [
              { text: 'Votre Club', style: 'companyName' },
              { text: invoice.club?.name || '', style: 'companyDetails' },
              { text: invoice.club?.code || '', style: 'companyDetails' }
            ],
            alignment: 'right'
          }
        ]
      },
      { text: '', margin: [0, 20] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'Période', style: 'tableHeader' },
              { text: 'Montant', style: 'tableHeader' }
            ],
            [
              'Transactions de la période',
              `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`,
              `${invoice.total_amount.toFixed(2)}€`
            ],
            [
              { text: 'Commission', colSpan: 2 },
              {},
              `${invoice.commission_amount.toFixed(2)}€`
            ],
            [
              { text: 'Total à payer', style: 'total', colSpan: 2 },
              {},
              { 
                text: `${(invoice.commission_amount).toFixed(2)}€`,
                style: 'total'
              }
            ]
          ]
        }
      },
      { text: '', margin: [0, 20] },
      {
        stack: [
          { text: 'Informations de paiement', style: 'subheader' },
          { text: 'Virement bancaire:', margin: [0, 10] },
          { text: 'IBAN: FR76 XXXX XXXX XXXX XXXX XXXX XXX' },
          { text: 'BIC: XXXXXXXX' },
          { 
            text: 'Merci d\'indiquer le numéro de facture dans le libellé du virement',
            style: 'note',
            margin: [0, 10]
          }
        ]
      }
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      invoiceNumber: {
        fontSize: 14,
        margin: [0, 5, 0, 5]
      },
      date: {
        fontSize: 12,
        color: '#666666'
      },
      companyName: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      companyDetails: {
        fontSize: 12,
        color: '#666666'
      },
      tableHeader: {
        bold: true,
        fontSize: 13,
        color: '#666666'
      },
      total: {
        bold: true,
        fontSize: 13
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      note: {
        fontSize: 10,
        italics: true,
        color: '#666666'
      }
    },
    defaultStyle: {
      font: 'Helvetica'
    }
  };

  return new Promise((resolve) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBlob((blob) => {
      resolve(blob);
    });
  });
}
