import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function QrVisitPage({ params }: PageProps) {
  const { token } = await params;
  redirect(`/feed?boothToken=${encodeURIComponent(token)}`);
}
