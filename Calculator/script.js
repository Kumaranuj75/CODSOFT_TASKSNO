// ---------- 1. Data: every key described once ----------
const SYMBOL = { add: "+", sub: "−", mul: "×", div: "÷" };

const KEYS = [
  { label: "AC", type: "clear", cls: "fn" },
  { label: "⌫", type: "back", cls: "fn" },
  { label: "%", type: "percent", cls: "fn" },
  { label: "÷", type: "op", value: "div", cls: "op" },
  { label: "7", type: "digit", value: "7" },
  { label: "8", type: "digit", value: "8" },
  { label: "9", type: "digit", value: "9" },
  { label: "×", type: "op", value: "mul", cls: "op" },
  { label: "4", type: "digit", value: "4" },
  { label: "5", type: "digit", value: "5" },
  { label: "6", type: "digit", value: "6" },
  { label: "−", type: "op", value: "sub", cls: "op" },
  { label: "1", type: "digit", value: "1" },
  { label: "2", type: "digit", value: "2" },
  { label: "3", type: "digit", value: "3" },
  { label: "+", type: "op", value: "add", cls: "op" },
  { label: "±", type: "sign", cls: "fn" },
  { label: "0", type: "digit", value: "0" },
  { label: ".", type: "dot" },
  { label: "=", type: "equals", cls: "eq" },
];

// ---------- 2. State ----------
let s = { cur: "0", prev: null, op: null, fresh: false, error: false, expr: "" };
const history = [];

const elValue = document.getElementById("value");
const elExpr = document.getElementById("expr");
const elKeys = document.getElementById("keys");
const elHistory = document.getElementById("history");
const opButtons = {};

// ---------- 3. Build the buttons with a loop ----------
for (let i = 0; i < KEYS.length; i++) {
  const k = KEYS[i];
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = k.label;
  b.className = k.cls || "";
  b.dataset.index = i;
  if (k.type === "op") opButtons[k.value] = b;
  elKeys.appendChild(b);
}

// ---------- 4. Formatting helpers ----------
function group(str) {
  const neg = str.startsWith("-");
  if (neg) str = str.slice(1);
  const parts = str.split(".");
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + int + (parts.length > 1 ? "." + parts[1] : "");
}

function clean(n) {
  if (!isFinite(n)) return null;
  const r = parseFloat(n.toPrecision(12)); // 0.1 + 0.2 becomes 0.3
  if (Math.abs(r) >= 1e15 || (r !== 0 && Math.abs(r) < 1e-9)) {
    return r.toExponential(6).replace(/\.?0+e/, "e");
  }
  return String(r);
}

// ---------- 5. The math: if-else on the operator ----------
function compute(a, op, b) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  if (op === "add") return x + y;
  else if (op === "sub") return x - y;
  else if (op === "mul") return x * y;
  else if (op === "div") {
    if (y === 0) return null; // divide by zero
    return x / y;
  }
  return y;
}

// ---------- 6. Drawing the screen ----------
function render() {
  const text = s.error ? "Cannot divide by zero" : group(s.cur);
  elValue.textContent = text;
  elValue.className = "value" + (s.error ? " err" : text.length > 14 ? " sm" : text.length > 10 ? " md" : "");
  elExpr.textContent = s.expr;
  for (const key in opButtons) {
    opButtons[key].classList.toggle("active", s.op === key && s.fresh);
  }
}

function renderHistory() {
  elHistory.innerHTML = "";
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.result = h.result;
    btn.innerHTML = "<span></span><span class='res'></span>";
    btn.children[0].textContent = h.expr;
    btn.children[1].textContent = group(h.result);
    li.appendChild(btn);
    elHistory.appendChild(li);
  }
}

// ---------- 7. One small function per kind of key ----------
function resetError() {
  if (s.error) s = { cur: "0", prev: null, op: null, fresh: false, error: false, expr: "" };
}

function digit(d) {
  resetError();
  if (s.fresh) { s.cur = d; s.fresh = false; }
  else if (s.cur === "0") s.cur = d;
  else if (s.cur.replace(/[-.]/g, "").length < 15) s.cur += d;
}

function dot() {
  resetError();
  if (s.fresh) { s.cur = "0."; s.fresh = false; }
  else if (!s.cur.includes(".")) s.cur += ".";
}

function operator(op) {
  resetError();
  if (s.op !== null && !s.fresh) {          // chain: 2 + 3 + ...
    const r = compute(s.prev, s.op, s.cur);
    if (r === null) { fail(); return; }
    s.cur = clean(r);
  }
  s.prev = s.cur;
  s.op = op;
  s.fresh = true;
  s.expr = group(s.prev) + " " + SYMBOL[op];
}

function equals() {
  if (s.op === null || s.error) return;
  const left = s.prev, right = s.cur, op = s.op;
  const r = compute(left, op, right);
  if (r === null) { fail(); return; }
  const result = clean(r);
  const line = group(left) + " " + SYMBOL[op] + " " + group(right);
  s.expr = line + " =";
  s.cur = result;
  s.prev = null;
  s.op = null;
  s.fresh = true;
  history.push({ expr: line, result });
  if (history.length > 5) history.shift();
  renderHistory();
}

function fail() {
  s = { cur: "0", prev: null, op: null, fresh: true, error: true, expr: "" };
}

function clearAll() {
  s = { cur: "0", prev: null, op: null, fresh: false, error: false, expr: "" };
}

function back() {
  if (s.error) { clearAll(); return; }
  if (s.fresh) return;
  const tooShort = s.cur.length === 1 || (s.cur.length === 2 && s.cur[0] === "-");
  s.cur = tooShort ? "0" : s.cur.slice(0, -1);
}

function percent() {
  if (s.error) return;
  const r = clean(parseFloat(s.cur) / 100);
  if (r !== null) { s.cur = r; s.fresh = true; }
}

function sign() {
  if (s.error || s.cur === "0") return;
  s.cur = s.cur[0] === "-" ? s.cur.slice(1) : "-" + s.cur;
}

// ---------- 8. Every key goes through press() ----------
function press(k) {
  if (k.type === "digit") digit(k.value);
  else if (k.type === "dot") dot();
  else if (k.type === "op") operator(k.value);
  else if (k.type === "equals") equals();
  else if (k.type === "clear") clearAll();
  else if (k.type === "back") back();
  else if (k.type === "percent") percent();
  else if (k.type === "sign") sign();
  render();
}

// ---------- 9. Event listeners ----------
elKeys.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) press(KEYS[Number(b.dataset.index)]);
});

elHistory.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  s = { cur: b.dataset.result, prev: null, op: null, fresh: true, error: false, expr: "" };
  render();
});

const KEYMAP = { "+": "add", "-": "sub", "*": "mul", x: "mul", "/": "div" };

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key;
  const onButton = e.target.closest && e.target.closest("#keys button");
  if (onButton && (key === "Enter" || key === " ")) return; // let the focused button click itself

  if (key.length === 1 && key >= "0" && key <= "9") press({ type: "digit", value: key });
  else if (key === "." || key === ",") press({ type: "dot" });
  else if (KEYMAP[key]) { e.preventDefault(); press({ type: "op", value: KEYMAP[key] }); }
  else if (key === "Enter" || key === "=") { e.preventDefault(); press({ type: "equals" }); }
  else if (key === "Backspace") press({ type: "back" });
  else if (key === "Escape" || key === "Delete") press({ type: "clear" });
  else if (key === "%") press({ type: "percent" });
});

render();