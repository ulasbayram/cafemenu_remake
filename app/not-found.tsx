import Link from "next/link";
export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Bu menü henüz hazır değil.</h1>
      <p>Menü adresini kontrol edin veya kafe çalışanına danışın.</p>
      <Link href="/">Fincan’a dön</Link>
    </div>
  );
}
