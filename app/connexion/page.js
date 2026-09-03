import MemberAccount from "@/components/MemberAccount";

export const metadata = { title: "Connexion", description: "Connecte-toi à ton espace membre Ligue 1 Express." };

export default function LoginPage() {
  return <main className="page-shell member-account-page"><MemberAccount /></main>;
}
