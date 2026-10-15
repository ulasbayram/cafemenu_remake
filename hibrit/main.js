const form = document.querySelector(".contactForm");
if (form) {
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let notice = form.querySelector('[role="status"]');
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "contactStatus";
      notice.setAttribute("role", "status");
      form.append(notice);
    }
    // No recipient or backend has been configured. Never claim delivery.
    notice.textContent =
      "İletişim formumuz henüz aktif değil. Mesajınız gönderilmedi ve bilgileriniz kaydedilmedi.";
  });
  // Without JavaScript the form stays disabled to avoid a native GET submission.
  button.disabled = false;
}

const copyright = document.querySelector(".footer > div > span:last-child");
if (copyright) copyright.textContent = `© ${new Date().getFullYear()} Hibrit`;
