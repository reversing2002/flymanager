import { supabase } from '@/lib/supabase';

interface EmailRecipient {
  email: string;
  name: string;
}

interface EmailRequest {
  subject: string;
  content: string;
  recipients: EmailRecipient[];
  settings: {
    mailjet_api_key: string;
    mailjet_api_secret: string;
    sender_email: string;
    sender_name: string;
  };
}

export async function sendBulkEmail(request: EmailRequest): Promise<void> {
  const { subject, content, recipients, settings } = request;

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(
        `${settings.mailjet_api_key}:${settings.mailjet_api_secret}`
      )}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: settings.sender_email,
            Name: settings.sender_name,
          },
          To: recipients.map((recipient) => ({
            Email: recipient.email,
            Name: recipient.name,
          })),
          Subject: subject,
          HTMLPart: content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erreur Mailjet: ${JSON.stringify(error)}`);
  }
}

export async function getMembersByFilters(
  clubId: string,
  groups?: string[],
  contributionYear?: string
): Promise<EmailRecipient[]> {
  let query = supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      user_group_memberships!inner(group_id),
      member_contributions!inner(valid_from, valid_until),
      club_members!inner(club_id)
    `)
    .eq('club_members.club_id', clubId);

  if (groups && groups.length > 0) {
    query = query.in('user_group_memberships.group_id', groups);
  }

  if (contributionYear) {
    const startOfYear = `${contributionYear}-01-01`;
    const endOfYear = `${contributionYear}-12-31`;
    query = query
      .lte('member_contributions.valid_from', endOfYear)
      .gte('member_contributions.valid_until', startOfYear);
  }

  const { data: members, error } = await query;

  if (error) {
    throw new Error(`Erreur lors de la récupération des membres: ${error.message}`);
  }

  return members.map((member) => ({
    email: member.email,
    name: `${member.first_name} ${member.last_name}`,
  }));
}
