import MemberAccount from "@/components/MemberAccount";

export const metadata = { title: "Connexion", description: "Connecte-toi à ton espace membre Foot Français Express." };

export default function LoginPage() {
  return <main className="page-shell member-account-page"><MemberAccount /></main>;
}
