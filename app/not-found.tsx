import NavLink from "@/components/nav-link";
export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Bu menü henüz hazır değil.</h1>
      <p>Menü adresini kontrol edin veya işletme çalışanına danışın.</p>
      <NavLink href="/">Fincan’a dön</NavLink>
    </div>
  );
}
