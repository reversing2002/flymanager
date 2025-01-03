import EmailMembersPage from '@/components/admin/EmailMembersPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Envoyer des emails aux membres | Administration',
  description: 'Envoi d\'emails groupés aux membres du club',
};

export default function Page() {
  return <EmailMembersPage />;
}
