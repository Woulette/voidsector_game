// Launcher balances stay fully readable, including when the header font adapts.
// Keep this formatter local to the launcher: prices and the combat HUD use their
// existing formatters and the server remains the authority for balances.
const GROUP_SEPARATOR = "\u202f";

function integerDigits(value){
  if(typeof value === "bigint") return value > 0n ? value.toString() : "0";
  if(typeof value === "number"){
    if(!Number.isFinite(value) || value <= 0) return "0";
    return BigInt(Math.floor(value)).toString();
  }
  // Preserve integer strings without passing through Number and losing digits.
  if(typeof value === "string"){
    const match = value.trim().match(/^\+?(\d+)(?:\.\d+)?$/);
    if(match) return match[1].replace(/^0+(?=\d)/, "");
  }
  return "0";
}

export function formatLauncherCurrency(value){
  const integer = integerDigits(value);
  const digits = integer.length;
  const text = integer.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
  return {
    text,
    fullText:text,
    digits,
    size:digits > 12 ? "huge" : digits > 9 ? "long" : "normal"
  };
}

export function updateLauncherCurrency(element, value, label){
  const formatted = formatLauncherCurrency(value);
  if(!element) return formatted;
  const accessibleLabel = `${formatted.fullText} ${label || ""}`.trim();
  element.textContent = formatted.text;
  element.dataset.currencySize = formatted.size;
  element.dataset.currencyDigits = String(formatted.digits);
  element.setAttribute("aria-label", accessibleLabel);
  element.title = accessibleLabel;
  return formatted;
}
