"use client";

import { useState } from "react";
import { ChartNoAxesCombined, Clock } from "lucide-react";

type Visit = { cafe: string; day: string; hour: number; count: number };
const number = (value: number) => value.toLocaleString("tr-TR");

export default function VisitChart({
  visits,
  days,
  today,
  cafes,
  loading,
  title = "Ziyaretçi trafiği",
  showTotal = false,
  allowCafeView = false,
}: {
  visits: Visit[];
  days: number;
  today: string;
  cafes: { id: string; name: string }[];
  loading: boolean;
  title?: string;
  showTotal?: boolean;
  allowCafeView?: boolean;
}) {
  const [mode, setMode] = useState<"daily" | "hourly" | "cafes">("daily");
  const [selected, setSelected] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const buckets =
    mode === "cafes"
      ? cafes.map((cafe) => ({
          key: cafe.id,
          label: cafe.name,
          short: cafe.name,
          rows: visits.filter((visit) => visit.cafe === cafe.id),
        }))
      : mode === "hourly"
        ? Array.from({ length: 12 }, (_, index) => {
            const hour = index * 2;
            return {
              key: String(hour),
              label: `${String(hour).padStart(2, "0")}:00–${String(hour + 2).padStart(2, "0")}:00`,
              short: `${String(hour).padStart(2, "0")}:00`,
              rows: visits.filter((v) => v.hour >= hour && v.hour < hour + 2),
            };
          })
        : Array.from({ length: days }, (_, index) => {
            const date = new Date(`${today}T12:00:00Z`);
            date.setUTCDate(date.getUTCDate() - days + 1 + index);
            const key = date.toISOString().slice(0, 10);
            return {
              key,
              label: date.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Istanbul",
              }),
              short: date.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "numeric",
                timeZone: "Europe/Istanbul",
              }),
              rows: visits.filter((v) => v.day === key),
            };
          });
  const data = buckets.map((bucket) => ({
    ...bucket,
    count: bucket.rows.reduce((sum, row) => sum + row.count, 0),
  }));
  const total = data.reduce((sum, bucket) => sum + bucket.count, 0);
  const maximum = Math.max(
    4,
    Math.ceil(Math.max(...data.map((bucket) => bucket.count)) / 4) * 4,
  );
  const viewLabel =
    mode === "daily"
      ? "Günlük ziyaretler"
      : mode === "hourly"
        ? "Saatlik ziyaretler"
        : "İşletmelere göre ziyaretler";
  const viewOptions: ["daily" | "hourly" | "cafes", string][] = [
    ["daily", "Günlük"],
    ["hourly", "Saatlik"],
    ...(allowCafeView
      ? [["cafes", "İşletmelere göre"] as ["cafes", string]]
      : []),
  ];
  const active = data.find((bucket) => bucket.key === selected);
  const selectedHours = Array.from({ length: 24 }, (_, hour) => {
    const rows = active?.rows.filter((row) => row.hour === hour) ?? [];
    return {
      hour,
      count: rows.reduce((sum, row) => sum + row.count, 0),
      cafes: cafes
        .map((cafe) => ({
          name: cafe.name,
          count: rows
            .filter((row) => row.cafe === cafe.id)
            .reduce((sum, row) => sum + row.count, 0),
        }))
        .filter((cafe) => cafe.count > 0),
    };
  }).filter((hour) => hour.count > 0);

  return (
    <section className="panel visit-panel">
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          <p>
            {mode === "daily"
              ? "Günlere göre menü ziyaretlerini karşılaştırın."
              : mode === "hourly"
                ? "Seçili dönemin iki saatlik ziyaret dağılımı."
                : "Seçili dönemde ziyaret alan işletmeleri karşılaştırın."}
          </p>
        </div>
        {showTotal && (
          <strong className="visit-heading-total">
            {number(total)} <small>ziyaret</small>
          </strong>
        )}
      </div>
      <div className="visit-controls">
        <div className="period-control" aria-label="Grafik görünümü">
          {viewOptions.map(([value, label]) => (
            <button
              key={value}
              aria-pressed={mode === value}
              className={mode === value ? "active" : ""}
              onClick={() => {
                setMode(value);
                setSelected(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="text-btn"
          aria-expanded={showTable}
          onClick={() => setShowTable(!showTable)}
        >
          {showTable ? "Grafiğe dön" : "Verileri tabloyla gör"}
        </button>
      </div>
      {loading ? (
        <p className="visit-placeholder" role="status">
          Ziyaret verileri yükleniyor…
        </p>
      ) : (
        <>
          <p className="visit-hint" hidden={showTable}>
            Tam sayıyı görmek için bir sütuna dokunun veya tıklayın.
          </p>
          <div className="visit-scroll" hidden={showTable}>
            <div
              className="visit-chart"
              style={{
                minWidth:
                  mode === "cafes"
                    ? Math.max(420, data.length * 100)
                    : data.length > 12
                      ? data.length * 40
                      : 420,
              }}
            >
              <div className="visit-axis" aria-hidden="true">
                {[4, 3, 2, 1, 0].map((n) => (
                  <span key={n}>{number((maximum * n) / 4)}</span>
                ))}
              </div>
              <div className="visit-bars">
                {data.map((bucket, index) => (
                  <button
                    key={index}
                    className={`visit-bar-button ${active?.key === bucket.key ? "selected" : ""}`}
                    aria-pressed={active?.key === bucket.key}
                    aria-label={`${bucket.label}: ${number(bucket.count)} ziyaret`}
                    onClick={() => setSelected(bucket.key)}
                  >
                    <span className="visit-bar-track">
                      <span
                        className="visit-bar"
                        style={{
                          height: `${Math.max(2, (bucket.count / maximum) * 100)}%`,
                        }}
                      />
                    </span>
                    <span
                      className={`visit-bar-label ${mode === "cafes" ? "cafe-label" : ""}`}
                      title={mode === "cafes" ? bucket.label : undefined}
                    >
                      {bucket.short}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="visit-detail" aria-live="polite" aria-atomic="true">
            {active ? (
              <>
                <div className="visit-detail-heading">
                  <span>{active.label}</span>
                  <strong>
                    {number(active.count)} <small>ziyaret</small>
                  </strong>
                </div>
                <div className="visit-breakdown">
                  {cafes
                    .map((cafe) => ({
                      ...cafe,
                      count: active.rows
                        .filter((row) => row.cafe === cafe.id)
                        .reduce((sum, row) => sum + row.count, 0),
                    }))
                    .filter((cafe) => cafe.count > 0)
                    .map((cafe) => (
                      <span key={cafe.id}>
                        {cafe.name}
                        <b>{number(cafe.count)}</b>
                      </span>
                    ))}
                </div>
                {mode !== "hourly" && selectedHours.length > 0 && (
                  <section
                    className="visit-hour-detail"
                    aria-label="Seçilen günün saatlik ziyaretleri"
                  >
                    <div className="visit-hour-title">
                      <strong>Saatlere göre ziyaretler</strong>
                      <span>
                        Türkiye saati ·{" "}
                        {mode === "cafes"
                          ? "Seçili dönemin saat dağılımı"
                          : "Ziyaret kaydı olan saatler"}
                      </span>
                    </div>
                    <div
                      className="visit-table-wrap"
                      role="region"
                      aria-label="Kaydırılabilir saatlik ziyaret detayı"
                      tabIndex={0}
                    >
                      <table className="visit-table">
                        <caption className="sr-only">
                          {active.label} saatlik ziyaret dağılımı
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Saat aralığı</th>
                            <th scope="col">Ziyaret</th>
                            {cafes.length > 1 && (
                              <th scope="col">İşletme dağılımı</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHours.map((hour) => (
                            <tr key={hour.hour}>
                              <th scope="row">
                                {String(hour.hour).padStart(2, "0")}:00–
                                {String(hour.hour).padStart(2, "0")}:59
                              </th>
                              <td className="visit-table-count">
                                {number(hour.count)}
                              </td>
                              {cafes.length > 1 && (
                                <td>
                                  <div className="visit-hour-cafes">
                                    {hour.cafes.map((cafe) => (
                                      <span key={cafe.name}>
                                        {cafe.name}: <b>{number(cafe.count)}</b>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {active.count === 0 && <p>Bu aralıkta kayıtlı ziyaret yok.</p>}
              </>
            ) : (
              <>
                <ChartNoAxesCombined size={20} />
                <p>
                  {total === 0
                    ? "Bu dönemde henüz ziyaret yok. QR menünüzü paylaşarak başlayın."
                    : mode === "cafes"
                      ? "Bir işletme seçin; ziyaret toplamı ve saatlik dağılımı burada görünsün."
                      : showTable
                        ? mode === "daily"
                          ? "Bir gün seçin; o günün saatlik ziyaretleri burada görünsün."
                          : "Bir saat seçerek işletme dağılımını inceleyin."
                        : "Bir sütun seçin; ziyaret sayısı ve işletme dağılımı burada görünsün."}
                </p>
              </>
            )}
          </div>
          {showTable && (
            <section className="visit-table-card" aria-label="Ziyaret verileri">
              <header className="visit-table-summary">
                <div>
                  <strong>{viewLabel}</strong>
                  <span>
                    {data.length} {mode === "cafes" ? "işletme" : "aralık"} ·
                    Detay için{" "}
                    {mode === "cafes" ? "işletme adına" : "tarihe veya saate"}{" "}
                    dokunun
                  </span>
                </div>
                <span className="visit-table-total">
                  <b>{number(total)}</b> ziyaret
                </span>
              </header>
              <div
                className="visit-table-wrap"
                role="region"
                aria-label="Kaydırılabilir ziyaret tablosu"
                tabIndex={0}
              >
                <table className="visit-table">
                  <caption className="sr-only">
                    {viewLabel} · Toplam {number(total)} ziyaret
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        {mode === "daily"
                          ? "Tarih"
                          : mode === "hourly"
                            ? "Saat aralığı"
                            : "İşletme"}
                      </th>
                      <th scope="col">Ziyaret</th>
                      <th scope="col">Toplamdaki pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((bucket) => (
                      <tr
                        key={bucket.key}
                        className={active?.key === bucket.key ? "selected" : ""}
                      >
                        <th scope="row">
                          <button
                            className="text-btn"
                            aria-label={`${bucket.label} detayını göster`}
                            aria-pressed={active?.key === bucket.key}
                            onClick={() => setSelected(bucket.key)}
                          >
                            {bucket.label}
                          </button>
                        </th>
                        <td className="visit-table-count">
                          {number(bucket.count)}
                        </td>
                        <td>
                          <div className="visit-share">
                            <span
                              className="visit-share-track"
                              aria-hidden="true"
                            >
                              <span
                                style={{
                                  width: `${total ? (bucket.count / total) * 100 : 0}%`,
                                }}
                              />
                            </span>
                            <span>
                              {total
                                ? ((bucket.count / total) * 100).toLocaleString(
                                    "tr-TR",
                                    { maximumFractionDigits: 1 },
                                  )
                                : "0"}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="visit-table-note">
                {mode === "cafes"
                  ? "Seçili dönemde ziyaret alan işletmeler listelenir."
                  : "Tüm aralıklar listelenir."}{" "}
                Devamını görmek için tabloyu kaydırın.
              </footer>
            </section>
          )}
        </>
      )}
      <div className="chart-footer">
        <Clock size={14} />
        <span>
          Türkiye saati · Aynı tarayıcı, aynı gün içinde bir kez sayılır.
        </span>
      </div>
    </section>
  );
}
