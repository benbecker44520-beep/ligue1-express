import Script from "next/script";

export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminLayout({ children }) {
  return (
    <>
      <Script id="admin-access-proxy" strategy="beforeInteractive">{`
        (() => {
          if (typeof window === "undefined" || window.__ffeAdminFetchPatched) return;
          window.__ffeAdminFetchPatched = true;
          const nativeFetch = window.fetch.bind(window);
          window.fetch = (input, init = {}) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.includes("/rest/v1/rpc/is_current_user_admin")) {
              const headers = new Headers(init.headers || (typeof input !== "string" ? input?.headers : undefined));
              return nativeFetch("/api/admin/access-check", {
                method: "POST",
                headers: {
                  Authorization: headers.get("Authorization") || headers.get("authorization") || "",
                  "Content-Type": "application/json"
                },
                body: "{}",
                cache: "no-store"
              });
            }
            return nativeFetch(input, init);
          };
        })();
      `}</Script>
      {children}
    </>
  );
}
