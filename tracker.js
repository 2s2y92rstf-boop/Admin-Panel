/**
 * tracker.js — вставте цей скрипт на будь-яку сторінку сайту
 * Він перехоплює форми і відправляє дані на ваш сервер логування
 *
 * Використання:
 *   <script src="/tracker.js" data-server="https://your-server.com"></script>
 */

(function () {
  "use strict";

  const SERVER = document.currentScript?.dataset?.server || "http://localhost:3000";

  // Визначаємо тип форми за полями/id/class/action
  function detectFormType(form) {
    const text = (
      form.id + " " +
      form.className + " " +
      form.action + " " +
      form.innerHTML
    ).toLowerCase();

    if (text.includes("pay") || text.includes("card") || text.includes("credit") ||
        text.includes("oplat") || text.includes("checkout")) return "payment";
    if (text.includes("register") || text.includes("signup") || text.includes("sign_up") ||
        text.includes("reest") || text.includes("реєстр")) return "register";
    if (text.includes("login") || text.includes("signin") || text.includes("sign_in") ||
        text.includes("вхід") || text.includes("логін")) return "login";
    return "form";
  }

  // Маскуємо чутливі значення
  function maskValue(name, value) {
    const sensitive = ["password", "pass", "pwd", "secret", "cvv", "cvc", "pin"];
    if (sensitive.some((s) => name.toLowerCase().includes(s))) return "••••••••";
    // Маскуємо номер картки — показуємо лише останні 4 цифри
    if (name.toLowerCase().includes("card") && /\d{12,}/.test(value.replace(/\s/g, ""))) {
      return "•••• •••• •••• " + value.replace(/\s/g, "").slice(-4);
    }
    return value;
  }

  // Збираємо дані форми
  function collectFormData(form) {
    const data = {};
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      if (!input.name && !input.id) return;
      const key = input.name || input.id;
      const value = input.type === "checkbox" ? (input.checked ? "true" : "false") : input.value;
      data[key] = maskValue(key, value);
    });
    return data;
  }

  // Відправляємо лог на сервер
  function sendLog(payload) {
    fetch(SERVER + "/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {}); // мовчки ігноруємо помилки мережі
  }

  // Логуємо submit форми
  document.addEventListener("submit", function (e) {
    const form = e.target;
    if (!form || form.tagName !== "FORM") return;

    const formType = detectFormType(form);
    const fields = collectFormData(form);

    sendLog({
      event: "form_submit",
      form: formType,
      level: "info",
      page: window.location.pathname,
      url: window.location.href,
      fields,
      msg: `Форма [${formType}] відправлена на сторінці ${window.location.pathname}`,
    });
  }, true);

  // Логуємо фокус на чутливих полях (без значення)
  document.addEventListener("focusin", function (e) {
    const el = e.target;
    if (!["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;

    const name = (el.name || el.id || el.placeholder || "").toLowerCase();
    const sensitive = ["password", "card", "cvv", "cvc", "pin", "пароль"];
    if (!sensitive.some((s) => name.includes(s))) return;

    sendLog({
      event: "sensitive_field_focus",
      form: detectFormType(el.closest("form") || document.body),
      level: "warn",
      page: window.location.pathname,
      field: el.name || el.id || el.placeholder,
      msg: `Фокус на чутливому полі [${el.name || el.id}]`,
    });
  }, true);

  // Логуємо помилки валідації
  document.addEventListener("invalid", function (e) {
    const el = e.target;
    sendLog({
      event: "validation_error",
      form: detectFormType(el.closest("form") || document.body),
      level: "error",
      page: window.location.pathname,
      field: el.name || el.id,
      msg: `Помилка валідації поля [${el.name || el.id}]: ${el.validationMessage}`,
    });
  }, true);

  console.log("[Tracker] Ініціалізовано →", SERVER);
})();
