/**
 * A PLC data register stores one 16-bit pattern.
 * Signed, unsigned, and hexadecimal views are derived from that pattern.
 */

export const INT16_MIN = -32768;
export const INT16_MAX = 32767;
export const UINT16_MAX = 65535;

export const PRESETS = [
  { id: "zero", label: "Zero", raw: 0x0000 },
  { id: "one", label: "One", raw: 0x0001 },
  { id: "max-signed", label: "Maximum Signed", raw: 0x7fff },
  { id: "min-signed", label: "Minimum Signed", raw: 0x8000 },
  { id: "max-unsigned", label: "Maximum Unsigned", raw: 0xffff },
  { id: "alternating", label: "Alternating Bits", raw: 0xaaaa },
  { id: "all-off", label: "All Bits OFF", raw: 0x0000 },
  { id: "all-on", label: "All Bits ON", raw: 0xffff },
];

function incomplete(message) {
  return { ok: false, reason: "incomplete", message };
}

function invalid(message) {
  return { ok: false, reason: "invalid", message };
}

export function toUnsigned(raw) {
  return raw & 0xffff;
}

export function toSigned(raw) {
  const value = toUnsigned(raw);
  return value >= 0x8000 ? value - 0x10000 : value;
}

export function toHex(raw) {
  return `0x${toUnsigned(raw).toString(16).toUpperCase().padStart(4, "0")}`;
}

export function formatBinary(raw) {
  const bits = toUnsigned(raw).toString(2).padStart(16, "0");
  return `${bits.slice(0, 4)} ${bits.slice(4, 8)} ${bits.slice(8, 12)} ${bits.slice(12, 16)}`;
}

export function hexDigits(raw) {
  return toHex(raw).slice(2).split("");
}

export function bitValue(raw, bitIndex) {
  return (toUnsigned(raw) >>> bitIndex) & 1;
}

export function toggleBit(raw, bitIndex) {
  if (!Number.isInteger(bitIndex) || bitIndex < 0 || bitIndex > 15) {
    throw new RangeError("Bit index must be an integer from 0 to 15.");
  }
  return toUnsigned(raw) ^ (1 << bitIndex);
}

export function unsignedWeight(bitIndex) {
  return 2 ** bitIndex;
}

export function signedWeight(bitIndex) {
  return bitIndex === 15 ? INT16_MIN : 2 ** bitIndex;
}

export function formatWeightedSum(raw, mode) {
  const weights = [];
  for (let bit = 15; bit >= 0; bit -= 1) {
    if (bitValue(raw, bit) !== 1) continue;
    weights.push(mode === "signed" ? signedWeight(bit) : unsignedWeight(bit));
  }
  const total = mode === "signed" ? toSigned(raw) : toUnsigned(raw);
  if (weights.length === 0) return `0 = ${total}`;
  const body = weights
    .map((weight) => (weight < 0 ? `(${weight})` : String(weight)))
    .join(" + ");
  return `${body} = ${total}`;
}

export function sliderRange(mode) {
  if (mode === "signed") return { min: INT16_MIN, max: INT16_MAX };
  if (mode === "unsigned") return { min: 0, max: UINT16_MAX };
  throw new RangeError("Slider mode must be signed or unsigned.");
}

export function rawToSlider(raw, mode) {
  return mode === "signed" ? toSigned(raw) : toUnsigned(raw);
}

export function parseSignedInput(text) {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "+" || trimmed === "-") {
    return incomplete("Enter a whole number.");
  }
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return invalid("Enter a whole number using digits only.");
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < INT16_MIN) {
    return invalid("Below the INT16 minimum of -32768.");
  }
  if (value > INT16_MAX) {
    return invalid("Above the INT16 maximum of 32767.");
  }
  return { ok: true, raw: value < 0 ? value + 0x10000 : value };
}

export function parseUnsignedInput(text) {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === "+") {
    return incomplete("Enter a whole number.");
  }
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return invalid("Enter a whole number using digits only.");
  }
  if (trimmed.startsWith("-")) {
    return invalid("Unsigned values cannot be negative.");
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > UINT16_MAX) {
    return invalid("Above the UINT16 maximum of 65535.");
  }
  return { ok: true, raw: value };
}

export function parseHexInput(text) {
  const trimmed = text.trim();
  if (trimmed === "" || /^0x$/i.test(trimmed)) {
    return incomplete("Enter a hexadecimal value.");
  }
  const match = /^(?:0x)?([0-9a-f]+)$/i.exec(trimmed);
  if (!match) {
    return invalid("Use hexadecimal digits 0-9 and A-F, with an optional 0x prefix.");
  }
  if (match[1].length > 4) {
    return invalid("Hexadecimal is limited to four digits (0x0000 to 0xFFFF).");
  }
  return { ok: true, raw: Number.parseInt(match[1], 16) };
}

export function explainTwosComplement(raw) {
  const unsigned = toUnsigned(raw);
  const signed = toSigned(unsigned);
  if (signed >= 0) return null;

  if (signed === INT16_MIN) {
    const magnitude = formatBinary(0x8000);
    const inverted = formatBinary((~0x8000) & 0xffff);
    return {
      summary:
        "INT16 cannot store +32768. The pattern 0x8000 is defined as -32768. Inverting those bits and adding 1 returns the same pattern.",
      steps: [
        {
          title: "1. Magnitude",
          binary: magnitude,
          note: "32768 does not fit in a positive INT16. It is shown here as a 16-bit magnitude.",
        },
        {
          title: "2. Invert all 16 bits",
          binary: inverted,
          note: "Each 0 becomes 1 and each 1 becomes 0.",
        },
        {
          title: "3. Add 1",
          binary: magnitude,
          note: "Adding 1 carries through the inverted bits and restores 0x8000.",
        },
        {
          title: "4. Resulting pattern",
          binary: magnitude,
          note: "INT16 -32768, UINT16 32768, hex 0x8000.",
        },
      ],
    };
  }

  const magnitude = -signed;
  const inverted = (~magnitude) & 0xffff;
  const result = (inverted + 1) & 0xffff;
  if (result !== unsigned) {
    throw new Error("Two's complement steps did not reproduce the register.");
  }

  return {
    summary: `${signed} is encoded as the two's complement of ${magnitude}. The bits store that transformed magnitude, not a separate minus sign.`,
    steps: [
      {
        title: "1. Positive magnitude",
        binary: formatBinary(magnitude),
        note: `${magnitude} written in 16 bits.`,
      },
      {
        title: "2. Invert all 16 bits",
        binary: formatBinary(inverted),
        note: "Each 0 becomes 1 and each 1 becomes 0.",
      },
      {
        title: "3. Add 1",
        binary: formatBinary(result),
        note: "Adding 1 finishes the two's complement.",
      },
      {
        title: "4. Resulting pattern",
        binary: formatBinary(result),
        note: `INT16 ${signed}, UINT16 ${unsigned}, hex ${toHex(unsigned)}.`,
      },
    ],
  };
}
