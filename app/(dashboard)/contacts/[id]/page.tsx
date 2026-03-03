import { ContactDetailPage } from "@/components/contacts/ContactDetailPage";

export default async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContactDetailPage id={Number(id)} />;
}
